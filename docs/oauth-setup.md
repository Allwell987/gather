# OAuth setup for Apple and Google sign-in

## 1. Supabase Auth providers

In Supabase Dashboard -> Authentication -> Providers:

- Enable Google
- Enable Apple

For each provider, add the redirect URLs for this app:

- https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
- gather://auth/callback

If you are using a custom domain or Expo development build, also add any app-specific redirect URLs required by your package name/bundle identifier.

## 2. Google OAuth configuration

Create or use an OAuth client in Google Cloud Console:

- Application type: Web application
- Authorized redirect URIs:
  - https://<your-supabase-project-ref>.supabase.co/auth/v1/callback

Then copy the Google OAuth client ID into one of these environment variables:

- EXPO_PUBLIC_GOOGLE_CLIENT_ID
- EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

The app will use the first non-empty value it finds.

## 3. Apple Sign In configuration

In Apple Developer -> Certificates, Identifiers & Profiles:

- Create or select an App ID for the bundle identifier `com.wealthrealitychurch.gather`
- Enable Sign in with Apple
- Create a Services ID if needed
- Configure the return URL to match the Supabase callback URL

For the Expo app, ensure the bundle identifier and Apple Sign In capability are configured in the native build.

## 4. Local app environment

Copy [.env.example](../.env.example) to `.env` and fill the values:

```bash
cp .env.example .env
```

Then restart Expo so the new values are bundled:

```bash
npm run start:clear
```
