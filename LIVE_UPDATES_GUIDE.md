# Live OTA Updates Guide for Gather

Gather is fully configured to support **Over-The-Air (OTA) Live Updates** using [Expo EAS Update](https://docs.expo.dev/eas-update/introduction/). This allows you to publish immediate UI fixes, text changes, screen updates, and JS logic updates without resubmitting a build to Google Play Store or Apple App Store.

---

## 🚀 How to Publish a Live Update

### 1. Production Update (Play Store Users)
To publish an instant update to production users:
```bash
npx eas update --branch production --message "Fix UI bug or update content"
```

### 2. Preview / Internal Testing Update
To publish an update to internal test builds:
```bash
npx eas update --branch preview --message "Testing new feature update"
```

---

## ⚡ What Gets Updated Automatically?

When you publish a live update:
1. **Background Auto-Check**: Gather checks for live updates whenever the app launches or returns to the foreground.
2. **Automatic Download**: If a new update matching runtime version `2.0.0` is available, it downloads in the background.
3. **User Notification**: A non-intrusive toast informs the user that a live update is ready.
4. **Manual Check**: Users can also go to **Profile > App Settings > Check for Live Updates** to manually trigger a check and restart the app immediately.

---

## 📋 What CAN vs. CANNOT be Updated via OTA

### ✅ Permitted via OTA Update (No Play Store Submission)
* Any JavaScript / TypeScript logic or state management changes
* React Native screens, components, and layout styling
* Copy changes, text, and asset image replacements
* Bug fixes in service files or API calls

### ❌ Requires a New Play Store Build (`eas build --platform android`)
* Adding or removing native plugins / Android permissions
* Upgrading React Native or Expo SDK versions
* Native C++ / Java / Kotlin binary changes in `android/`
* Bumping `runtimeVersion` in `app.config.js`

---

## 🛠 Built-In Update Infrastructure

- **`src/services/updates.ts`**: Handles native `expo-updates` checks, background downloads, and app reloads safely.
- **`src/hooks/useUpdates.ts`**: React hook that monitors app foreground events and displays update banners/toasts.
- **`App.tsx`**: Registered app-wide live update listener.
- **`ProfileScreen.tsx`**: Includes a **Check for Live Updates** setting row for manual checks.
