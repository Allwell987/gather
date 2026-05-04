# Implementation Plan - Set up Sentry

This plan outlines the steps to correctly integrate Sentry into the Gather app (Expo SDK 51). We will move from a manual, partially implemented wrapper to the official `@sentry/react-native` Expo integration.

## User Review Required

> [!IMPORTANT]
> - **Sentry DSN**: You must provide a valid Sentry DSN in your `.env` file under `EXPO_PUBLIC_SENTRY_DSN`.
> - **Sentry Auth Token**: For EAS builds to upload source maps, you must add `SENTRY_AUTH_TOKEN` to your EAS secrets: `eas secret:create --name SENTRY_AUTH_TOKEN --value your-token`.
> - **Organization and Project**: I will use placeholders for `organization` and `project` in `app.config.js`. Please update them with your actual Sentry organization and project slugs.

## Proposed Changes

### Configuration

#### [app.config.js](file:///Users/media/Desktop/gather-app/app.config.js)
- Add `@sentry/react-native/expo` plugin configuration.
- Add `organization` and `project` slugs (placeholders).

#### [metro.config.js](file:///Users/media/Desktop/gather-app/metro.config.js)
- Wrap the Metro configuration with `getSentryExpoConfig` to enable source map support.

---

### Sentry Service

#### [sentry.ts](file:///Users/media/Desktop/gather-app/src/services/sentry.ts)
- Refactor to use proper ES6 imports from `@sentry/react-native`.
- Remove manual interfaces and `require` hacks.
- Update `initSentry` to use modern configuration options.
- Maintain existing utility functions (`setSentryUser`, `captureSentryError`, etc.) using the official SDK.

---

### App Integration

#### [App.tsx](file:///Users/media/Desktop/gather-app/App.tsx)
- Wrap the default export `App` with `Sentry.wrap`.
- Ensure `initSentry()` is called at the top level.

---

### Android Native (Optional but Recommended)
- After these changes, it is recommended to run `npx expo prebuild --platform android` to ensure the native Android files are correctly synchronized with the Sentry plugin.

## Verification Plan

### Automated Tests
- Since Sentry integration is primarily a configuration and runtime setup, I will verify by:
    - Checking for syntax errors in the modified files.
    - Ensuring the app still starts (simulated by checking if the root component is correctly exported).

### Manual Verification
- **Runtime Check**: Verify that `initSentry` doesn't throw errors when DSN is missing (it should just warn).
- **Crash Test**: I can add a temporary button to trigger a test error to verify Sentry captures it (if I had a real DSN to test with).
