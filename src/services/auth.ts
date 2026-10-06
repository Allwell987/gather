// src/services/auth.ts
import * as Crypto from 'expo-crypto';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import {
  getAuthParamsFromUrl,
  getAuthRedirectUrl,
  manualAuthSession,
  getSupabaseAuthErrorMessage,
  getAuthFeedbackMessage,
  getSupabaseConfigMessage,
  supabase,
} from './supabase';

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

const APPLE_SIGN_IN_ERROR_MESSAGES: Record<string, string> = {
  ERR_REQUEST_CANCELED: 'Apple sign-in was canceled.',
  ERR_REQUEST_NOT_HANDLED: 'Apple sign-in is not available on this device right now.',
  ERR_INVALID_OPERATION: 'Apple sign-in is not configured correctly for this app yet.',
  ERR_REQUEST_UNKNOWN: 'Apple sign-in could not start because this iOS build is not authorized by Apple. Rebuild with signing enabled, then test on a physical device or a Simulator signed in to an Apple ID with two-factor authentication.',
};

function base64URLEncode(array: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';

  for (let i = 0; i < array.length; i += 3) {
    const b1 = array[i];
    const b2 = i + 1 < array.length ? array[i + 1] : NaN;
    const b3 = i + 2 < array.length ? array[i + 2] : NaN;

    const c1 = b1 >> 2;
    const c2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
    const c3 = isNaN(b2) ? 64 : ((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6);
    const c4 = isNaN(b3) ? 64 : b3 & 63;

    base64 += chars.charAt(c1) + chars.charAt(c2) + (c3 === 64 ? '' : chars.charAt(c3)) + (c4 === 64 ? '' : chars.charAt(c4));
  }

  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function signInWithGoogle(): Promise<{ user?: GoogleUser; error?: string }> {
  try {
    const configMessage = getSupabaseConfigMessage();

    if (configMessage) {
      return { error: configMessage };
    }

    // Plain URL so it matches the Supabase redirect allow-list exactly
    const redirectTo = getAuthRedirectUrl();

    const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (oauthError || !oauthData?.url) {
      return { error: getSupabaseAuthErrorMessage(oauthError?.message) };
    }

    manualAuthSession.active = true;
    let result: WebBrowser.WebBrowserAuthSessionResult;
    try {
      result = await WebBrowser.openAuthSessionAsync(oauthData.url, redirectTo, {
        showInRecents: true,
        createTask: false,
      });
    } finally {
      setTimeout(() => { manualAuthSession.active = false; }, 1500);
    }

    if (result.type !== 'success') {
      return { error: 'Authentication was cancelled or failed' };
    }

    // On some Android devices, the redirect might have already been handled by App.tsx
    // during the time WebBrowser was closing. Check for an active session first.
    const { data: { session: existingSession } } = await supabase.auth.getSession();
    if (existingSession?.user) {
      return { user: mapSupabaseUserToGoogleUser(existingSession.user) };
    }

    const params = getAuthParamsFromUrl(result.url);

    if (params.error || params.error_code || params.error_description) {
      return {
        error: getAuthFeedbackMessage({
          errorCode: params.error_code,
          errorDescription: params.error_description,
        }),
      };
    }

    if (!params.code && !params.access_token && !params.refresh_token) {
      return { error: 'Google sign-in did not return a valid auth response. Please try again.' };
    }

    // Handle session establishment via code (PKCE) or tokens (Implicit)
    if (params.code) {
      const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
      if (exchangeError) {
        // If it was already exchanged (e.g. by App.tsx), get the current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user) {
          return { user: mapSupabaseUserToGoogleUser(currentSession.user) };
        }
        return { error: getSupabaseAuthErrorMessage(exchangeError.message) };
      }

      const user = session?.user;
      if (user) return { user: mapSupabaseUserToGoogleUser(user) };
    } else if (params.access_token && params.refresh_token) {
      const { data: { session }, error: setSessionError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (setSessionError) return { error: getSupabaseAuthErrorMessage(setSessionError.message) };

      const user = session?.user;
      if (user) return { user: mapSupabaseUserToGoogleUser(user) };
    }

    return { error: 'Google sign-in did not return a valid session.' };
  } catch (err) {
    if (__DEV__) {
      console.error('Google sign-in error:', err);
    }
    return { error: 'An unexpected error occurred during sign in' };
  }
}

function mapSupabaseUserToGoogleUser(user: any): GoogleUser {
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? '',
    name: String(metadata.full_name ?? metadata.name ?? user.email ?? 'Google User'),
    picture: typeof metadata.avatar_url === 'string'
      ? metadata.avatar_url
      : (typeof metadata.picture === 'string' ? metadata.picture : undefined),
  };
}

export async function signInWithApple(): Promise<{ error?: string }> {
  try {
    const configMessage = getSupabaseConfigMessage();

    if (configMessage) {
      return { error: configMessage };
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();

    if (!isAvailable) {
      return { error: 'Apple sign-in is only available on supported Apple devices.' };
    }

    const rawNonce = generateNonce();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
      { encoding: Crypto.CryptoEncoding.HEX },
    );
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return { error: 'Apple did not return an identity token for this sign-in attempt.' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) {
      return { error: getSupabaseAuthErrorMessage(error.message) };
    }

    const fullName = formatAppleFullName(credential.fullName);

    if (fullName) {
      const { error: profileUpdateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          given_name: credential.fullName?.givenName ?? undefined,
          family_name: credential.fullName?.familyName ?? undefined,
        },
      });

      if (profileUpdateError) {
        if (__DEV__) {
          console.error('Apple profile update error:', profileUpdateError);
        }
      }
    }

    return {};
  } catch (err) {
    if (__DEV__) {
      console.error('Apple sign-in error:', err);
    }

    if (typeof err === 'object' && err && 'code' in err) {
      const code = String((err as { code?: string }).code);
      return { error: APPLE_SIGN_IN_ERROR_MESSAGES[code] ?? 'Apple sign-in could not be completed.' };
    }

    return { error: 'An unexpected error occurred during Apple sign-in.' };
  }
}

function generateNonce(): string {
  const randomBytes = Crypto.getRandomBytes(16);
  return base64URLEncode(randomBytes);
}

function formatAppleFullName(fullName: AppleAuthentication.AppleAuthenticationFullName | null) {
  return [
    fullName?.givenName,
    fullName?.middleName,
    fullName?.familyName,
  ].filter(Boolean).join(' ').trim();
}
