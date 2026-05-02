// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? 'https://YOUR_PROJECT.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? 'YOUR_ANON_KEY';
const authCallbackPath = 'auth/callback';
const authScheme = 'gather';
const SUPABASE_URL_PLACEHOLDERS = new Set([
  'https://YOUR_PROJECT.supabase.co',
  'https://your-project.supabase.co',
]);
const SUPABASE_KEY_PLACEHOLDERS = new Set([
  'YOUR_ANON_KEY',
  'your-anon-key',
]);
const SUPABASE_URL_REGEX = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i;
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
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

    return JSON.parse(atob(paddedBase64)) as {
      role?: string;
      ref?: string;
    };
  } catch {
    return null;
  }
};

// Secure token storage using expo-secure-store
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const getSupabaseConfigError = () => {
  if (!supabaseUrl || SUPABASE_URL_PLACEHOLDERS.has(supabaseUrl) || !SUPABASE_URL_REGEX.test(supabaseUrl)) {
    return 'Set EXPO_PUBLIC_SUPABASE_URL in your .env to your real Supabase project URL.';
  }

  if (!supabaseAnonKey || SUPABASE_KEY_PLACEHOLDERS.has(supabaseAnonKey)) {
    return 'Set EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env to your real Supabase anon key.';
  }

  if (SUPABASE_SECRET_KEY_REGEX.test(supabaseAnonKey)) {
    return 'EXPO_PUBLIC_SUPABASE_ANON_KEY must use a public Supabase anon or publishable key, never a secret key.';
  }

  if (
    !SUPABASE_LEGACY_JWT_KEY_REGEX.test(supabaseAnonKey)
    && !SUPABASE_PUBLISHABLE_KEY_REGEX.test(supabaseAnonKey)
  ) {
    return 'Set EXPO_PUBLIC_SUPABASE_ANON_KEY to the public anon or publishable key from your Supabase project.';
  }

  if (SUPABASE_LEGACY_JWT_KEY_REGEX.test(supabaseAnonKey)) {
    const payload = decodeJwtPayload(supabaseAnonKey);

    if (payload?.role && payload.role !== 'anon') {
      return 'EXPO_PUBLIC_SUPABASE_ANON_KEY is not the correct public anon key for this app. Copy the anon key again from Supabase and replace the current value.';
    }
  }

  return null;
};

export const supabaseConfigError = getSupabaseConfigError();
export const isSupabaseConfigured = !supabaseConfigError;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
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

export const getAuthRedirectUrl = () => Linking.createURL(authCallbackPath, isExpoGo
  ? undefined
  : { scheme: authScheme });

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
    return 'Supabase rejected the client API key. Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY come from the same Supabase project, use the public anon or publishable key, then restart Expo with npm run start:clear.';
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
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');

  const queryString = queryIndex >= 0
    ? url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined)
    : '';
  const hashString = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';
  const params = new URLSearchParams(
    [queryString, hashString].filter(Boolean).join('&')
  );

  return Object.fromEntries(params.entries());
};
