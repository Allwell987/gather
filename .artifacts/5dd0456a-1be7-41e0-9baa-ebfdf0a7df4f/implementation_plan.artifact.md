# Implementation Plan - App Icon Refinement

I will refine the app's icon configuration and assets to ensure a professional look that aligns with the "Gather" (Wealth Reality Church) brand. I'll leverage the existing branding assets and the `sips` tool to generate optimized icons.

## User Review Required

> [!IMPORTANT]
> I have found that `assets/logo_old.png` is already a 1024x1024 square, while `assets/logo.png` is a high-res rectangle. I will use `logo_old.png` as the primary base for the new icon as it is likely the intended square format.
>
> **Decision Point:** If you have a specific *new* design, please upload it to the `assets/` folder. Otherwise, I will proceed with the "Gold on Deep Brown" theme using the existing logo assets.

## Proposed Changes

### Assets Processing
I will use the `sips` command-line tool to prepare the assets:

#### [MODIFY] `assets/icon.png`
- Replace with an optimized 1024x1024 version of the logo.

#### [MODIFY] `assets/adaptive-icon.png`
- Generate a foreground-only image for Android. I will ensure the logo is centered within the "safe zone" (approx. 66% of the area) to prevent clipping by Android's masking shapes (circles, squircles, etc.).

#### [MODIFY] `assets/notification-icon.png`
- Create a simplified, high-contrast version of the logo suitable for the status bar.

### Configuration

#### [MODIFY] [app.config.js](file:///Users/media/Desktop/gather-app/app.config.js)
- Ensure `android.adaptiveIcon.backgroundColor` matches the brand deep brown (`#1e140a`).
- Update `notification` icon color to match the primary brand accent (Sapphire Blue `#1a56db`).

## Verification Plan

### Automated Tests
- Run `sips -g pixelWidth -g pixelHeight assets/*.png` to verify dimensions.
- Run `npx expo-doctor` to validate the Expo configuration.

### Manual Verification
- Check the icon appearance on a physical device or emulator (Android and iOS).
- Verify that the notification icon appears correctly in the status bar during a test push notification.
