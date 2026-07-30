# Walkthrough - TestFlight Automation

I have updated the project configuration to streamline the TestFlight submission process.

## Changes Made

### Configuration Update
#### [app.config.js](file:///Users/media/Desktop/gather-app/app.config.js)
Added the `ITSAppUsesNonExemptEncryption: false` flag to the iOS configuration.
- **Benefit:** This prevents the build from getting stuck in "Missing Compliance" status in App Store Connect. Your builds will now move straight to "Internal Testing" automatically.

## How to Deploy

To build and submit the app to TestFlight in one go, run this command in your terminal:

```bash
npx eas build --platform ios --profile production --auto-submit
```

### What happens next?
1. **Queueing:** Your build is sent to Expo's servers.
2. **Building:** Expo compiles the iOS binary (IPA).
3. **Submitting:** Once finished, Expo automatically uploads it to Apple.
4. **Processing:** Apple will process the file (takes ~15 mins).
5. **Ready:** You'll receive an email from Apple saying the build is ready for testing.

> [!TIP]
> You can monitor the progress in your browser via the Expo dashboard link that appears in the terminal after running the command.
