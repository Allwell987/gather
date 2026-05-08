// src/services/errorMapping.ts

/**
 * Maps technical backend/Supabase errors to user-friendly messages.
 * Technical details are only shown in development mode.
 */
export const getFriendlyErrorMessage = (error: any, fallback = 'Something went wrong. Please try again.'): string => {
  const message = (error?.message || String(error)).toLowerCase();

  // Network errors
  if (message.includes('network request failed') || message.includes('failed to fetch')) {
    return 'Could not connect to the internet. Please check your connection.';
  }

  // Auth / Permission errors
  if (message.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (message.includes('row-level security') || message.includes('permission denied')) {
    if (__DEV__) return `Dev Error: RLS Policy missing. ${message}`;
    return 'You do not have permission to perform this action.';
  }

  // Conflict / Duplicate errors
  if (message.includes('duplicate key') || message.includes('already exists')) {
    return 'This record already exists.';
  }

  // Database / SQL specific hints (Internal use)
  if (message.includes('relation') && message.includes('does not exist')) {
    if (__DEV__) return `Dev Error: Table missing. ${message}`;
    return 'A service interruption occurred. We are working on it.';
  }

  // Supabase bucket / storage
  if (message.includes('bucket not found')) {
    if (__DEV__) return `Dev Error: Storage bucket missing. ${message}`;
    return 'Could not upload file right now.';
  }

  return fallback;
};
