# Streak Logic Fix Walkthrough

I have successfully implemented the backend and frontend logic for the streak feature. Previously, the streak was only a display calculation in the UI and wasn't persisted. Now, streaks are automatically tracked in the database and updated in real-time in the app.

## Key Changes

### Database Trigger
I created a new SQL trigger that automatically updates the user's `streak_count` and `streak_last_date` whenever they mark a devotional as read.
- **File**: [streak_trigger.sql](file:///Users/media/Desktop/gather-app/database/streak_trigger.sql)
- **Logic**:
    - If it's the user's first time reading, the streak starts at 1.
    - If they read on the consecutive day, the streak increments.
    - If they miss a day, the streak resets to 1.
    - Multiple reads on the same day do not increment the streak further.

### App Integration
I updated the `useDevotional` hook to ensure the streak updates are reflected immediately in the UI without requiring a manual refresh.
- **File**: [useDevotional.ts](file:///Users/media/Desktop/gather-app/src/screens/today/hooks/useDevotional.ts)
- **Changes**:
    - Included `read_at` in the mark-as-read request to ensure the database trigger fires correctly.
    - Added logic to re-fetch the user's profile from the backend immediately after a successful update.
    - Updated the global `authStore` with the new profile data (including the new `streak_count`).

### Service Refactoring
To support the hook updates, I exposed some internal profile functions.
- **File**: [profile.ts](file:///Users/media/Desktop/gather-app/src/services/profile.ts)
- **Changes**: Exported `fetchProfileById` and `toStoredUserProfile`.

## UI Refinement: Minimal Streak
As requested, I moved the streak indicator to a "minimal point" on the Home Screen.
- **Before**: A large card in the middle of the screen displaying the streak count and status.
- **After**: A compact indicator (🔥 + count) in the top header, next to the notification bell. This keeps the home screen clean while still rewarding regular reading.
- **Logic**: The indicator only appears when you have an active streak (count > 0).

## Verification Results

### Automated Checks
- **Typecheck**: Ran `npm run typecheck`. No new errors were introduced in the modified files.
- **Lint**: Ran `npm run lint`. Confirmed no new linting issues in the touched components.

### Manual Verification Path
1. **Database Setup**: Apply the SQL in `database/streak_trigger.sql` to your Supabase instance.
2. **UI Test**:
    - Open the app and go to the **Today** tab.
    - Tap "Mark as Read" on today's devotional.
    - Navigate back to the **Home** screen.
    - The streak flame (🔥) and count should update immediately.
