# Implementation Plan: Fix Gradle, Build, and Submit App

This plan outlines the steps to resolve local Gradle build issues, generate production-ready builds for both iOS and Android using Expo Application Services (EAS), and automate their submission to the Google Play Console and Apple App Store Connect.

## User Review Required

> [!IMPORTANT]
> - **Credentials:** Ensure that the `google-play-service-account.json` in the `credentials/` folder has the necessary permissions for Play Store submission.
> - **Apple ID:** The plan uses the Apple ID `developer@wealthrealitychurch.com` found in `eas.json`. Ensure you have access to this account for App Store Connect submission.
> - **EAS Project ID:** The project is linked to EAS Project ID `33325d84-541e-4330-8a9d-09e1ed6eafec`.
> - **Local Environment:** The local Gradle issue appears to be related to environment variables and hardcoded paths in `gradle.properties`.

## Proposed Changes

### 1. Fix Local Gradle Environment

The goal is to resolve the `AndroidLocationsBuildService` error which prevents local Android builds.

#### [MODIFY] [gradle.properties](file:///Users/media/Desktop/gather-app/android/gradle.properties)
- Remove `systemProp.user.home=/Users/media` to allow Gradle to detect the home directory dynamically.
- Adjust `org.gradle.jvmargs` if necessary for compatibility with Java 25.

#### [MODIFY] [gradle-wrapper.properties](file:///Users/media/Desktop/gather-app/android/gradle/wrapper/gradle-wrapper.properties)
- Verify if Gradle 9.3.1 is stable for the current React Native version (0.86.3). Consider downgrading to 8.10.2 if instability persists.

### 2. Configure EAS for Production Builds

Ensure `eas.json` is fully configured for production builds and submissions.

#### [MODIFY] [eas.json](file:///Users/media/Desktop/gather-app/eas.json)
- Verify `serviceAccountKeyPath` is correct.
- Ensure the `production` profile has correct `channel` and `credentialsSource`.

### 3. Build and Submit Orchestration

We will use EAS to handle the heavy lifting of building and submitting, as it is the most reliable method for Expo projects.

#### Execution Steps:
1. **Android Build & Submit:**
   - Run `eas build --platform android --profile production --auto-submit`
   - This will build the AAB and automatically trigger `eas submit` to the `internal` track (as specified in `eas.json`).

2. **iOS Build & Submit:**
   - Run `eas build --platform ios --profile production --auto-submit`
   - This will build the IPA and automatically trigger `eas submit` to App Store Connect.

## Verification Plan

### Automated Verification
- **Gradle Check:** Run `./gradlew help` and `./gradlew :app:assembleDebug` (locally) to ensure the Gradle fix works.
- **EAS Build Status:** Monitor the EAS dashboard for build success.
- **EAS Submit Status:** Monitor the EAS dashboard for submission success.

### Manual Verification
- Check **Google Play Console** for the new internal build.
- Check **App Store Connect** (TestFlight) for the new build.
