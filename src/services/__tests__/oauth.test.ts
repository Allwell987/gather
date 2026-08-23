import { resolveGoogleClientId } from '../oauth';

describe('resolveGoogleClientId', () => {
  const originalPrimary = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const originalFallback = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  afterEach(() => {
    if (originalPrimary === undefined) {
      delete process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    } else {
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = originalPrimary;
    }

    if (originalFallback === undefined) {
      delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    } else {
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalFallback;
    }
  });

  it('falls back to the web client ID when the primary env var is empty', () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'fallback-google-client-id';

    expect(resolveGoogleClientId()).toBe('fallback-google-client-id');
  });
});
