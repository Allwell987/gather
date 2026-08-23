export function resolveGoogleClientId(): string {
  const primary = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const fallback = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

  return primary || fallback || '';
}
