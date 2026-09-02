// src/services/supabase.ts
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? 'https://YOUR_PROJECT.supabase.co';
const supabasePublishableKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.EXPO_PUBLIC_SUPABASE_KEY
)?.trim() ?? 'YOUR_PUBLISHABLE_KEY';
const authCallbackPath = 'auth/callback';
const authScheme = 'gather';
const SUPABASE_URL_PLACEHOLDERS = new Set([
  'https://YOUR_PROJECT.supabase.co',
  'https://your-project.supabase.co',
]);
const SUPABASE_KEY_PLACEHOLDERS = new Set([
  'YOUR_PUBLISHABLE_KEY',
  'your-publishable-key',
]);
const SUPABASE_LEGACY_JWT_KEY_REGEX = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const SUPABASE_PUBLISHABLE_KEY_REGEX = /^sb_publishable_[A-Za-z0-9._-]+$/;
const SUPABASE_SECRET_KEY_REGEX = /^sb_secret_[A-Za-z0-9._-]+$/;
const INVALID_SUPABASE_API_KEY_PATTERNS = [
  'invalid api key',
  'api key is invalid',
  'apikey is invalid',
  'invalid apikey',
  'no api key found in request',
];

const decodeJwtPayload = (token: string) => {
  const parts = token.split('.');

  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const base64WithPadding = base64 + padding;

    let decoded;
    if (typeof atob === 'function') {
      decoded = atob(base64WithPadding);
    } else {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let str = base64WithPadding.replace(/=+$/, '');
      let output = '';
      for (let bc = 0, bs = 0, buffer, i = 0; (buffer = str.charAt(i++)); ) {
        buffer = chars.indexOf(buffer);
        if (buffer === -1) continue;
        bs = bc % 4 ? bs * 64 + buffer : buffer;
        if (bc++ % 4) {
          output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
        }
      }
      decoded = output;
    }

    // JSON.parse can fail if there's trailing garbage from bitwise shifts or incorrect padding.
    // We slice from the first '{' to the last '}' to be safe.
    const start = decoded.indexOf('{');
    const end = decoded.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('Invalid JSON structure');
    const cleanJson = decoded.substring(start, end + 1);

    return JSON.parse(cleanJson) as {
      role?: string;
      ref?: string;
    };
  } catch (err) {
    if (__DEV__) {
      console.error('JWT decode error:', err);
    }
    return null;
  }
};

const isValidSupabaseUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
};

const getSupabaseConfigError = () => {
  if (!supabaseUrl || SUPABASE_URL_PLACEHOLDERS.has(supabaseUrl) || !isValidSupabaseUrl(supabaseUrl)) {
    return 'Set EXPO_PUBLIC_SUPABASE_URL in your .env to your real Supabase project URL.';
  }

  if (!supabasePublishableKey || SUPABASE_KEY_PLACEHOLDERS.has(supabasePublishableKey)) {
    return 'Set EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env to your real Supabase publishable key.';
  }

  if (SUPABASE_SECRET_KEY_REGEX.test(supabasePublishableKey)) {
    return 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must use a public Supabase anon or publishable key, never a secret key.';
  }

  if (
    !SUPABASE_LEGACY_JWT_KEY_REGEX.test(supabasePublishableKey)
    && !SUPABASE_PUBLISHABLE_KEY_REGEX.test(supabasePublishableKey)
  ) {
    return 'Set EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to the public anon or publishable key from your Supabase project.';
  }

  if (SUPABASE_LEGACY_JWT_KEY_REGEX.test(supabasePublishableKey)) {
    const payload = decodeJwtPayload(supabasePublishableKey);

    if (payload?.role && payload.role !== 'anon') {
      return 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not the correct public anon key for this app. Copy the public key again from Supabase and replace the current value.';
    }
  }

  return null;
};

export const supabaseConfigError = getSupabaseConfigError();
export const isSupabaseConfigured = !supabaseConfigError;

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const getSupabaseConfigMessage = () => {
  return supabaseConfigError
    ? `${supabaseConfigError} Replace the README placeholder values before signing in, then restart Expo so the new env values are bundled.`
    : null;
};

export type SupportedEmailOtpType =
  | 'signup'
  | 'invite'
  | 'magiclink'
  | 'recovery'
  | 'email_change'
  | 'email';

const supportedEmailOtpTypes: SupportedEmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
];

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const getAuthRedirectUrl = (params?: Record<string, string>) => {
  const url = Linking.createURL(authCallbackPath, isExpoGo
    ? undefined
    : { scheme: authScheme });

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    return `${url}${url.includes('?') ? '&' : '?'}${searchParams.toString()}`;
  }

  return url;
};

export const isSupportedEmailOtpType = (
  value?: string
): value is SupportedEmailOtpType => {
  return Boolean(value && supportedEmailOtpTypes.includes(value as SupportedEmailOtpType));
};

const normalizeAuthMessage = (value?: string) => value
  ?.replace(/\+/g, ' ')
  ?.trim();

export const getSupabaseAuthErrorMessage = (value?: string) => {
  const normalizedMessage = normalizeAuthMessage(value);
  const lowerMessage = normalizedMessage?.toLowerCase() ?? '';

  if (INVALID_SUPABASE_API_KEY_PATTERNS.some((pattern) => lowerMessage.includes(pattern))) {
    return 'Supabase rejected the client API key. Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY come from the same Supabase project, use the public anon or publishable key, then restart Expo with npm run start:clear.';
  }

  return normalizedMessage ?? 'We could not complete that Supabase request. Please try again.';
};

export const getAuthFeedbackMessage = ({
  errorCode,
  errorDescription,
}: {
  errorCode?: string;
  errorDescription?: string;
}) => {
  const normalizedDescription = normalizeAuthMessage(errorDescription);

  if (errorCode === 'otp_expired') {
    return 'That verification link has expired. Request a new email and use the latest link.';
  }

  if (normalizedDescription === 'Email link is invalid or has expired') {
    return 'That verification link is no longer valid. Request a new email and try again.';
  }

  if (normalizedDescription) {
    return getSupabaseAuthErrorMessage(normalizedDescription);
  }

  return 'We could not complete that email verification link. Please request a new one and try again.';
};

export const getAuthParamsFromUrl = (url: string) => {
  const normalizedUrl = normalizeAuthCallbackUrl(url);
  const queryIndex = normalizedUrl.indexOf('?');
  const hashIndex = normalizedUrl.indexOf('#');

  const queryString = queryIndex >= 0
    ? normalizedUrl.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined)
    : '';
  const hashString = hashIndex >= 0 ? normalizedUrl.slice(hashIndex + 1) : '';
  const params = new URLSearchParams(
    [queryString, hashString].filter(Boolean).join('&')
  );

  return Object.fromEntries(params.entries());
};

export const normalizeAuthCallbackUrl = (url: string) => {
  if (!url) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname === '/auth/callback') {
      return `${parsedUrl.origin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }
  } catch {
    // Ignore invalid URLs and fall back to the original string.
  }

  return url;
};
