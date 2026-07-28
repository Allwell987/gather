# Fix Bell Icon on Home Screen

The bell icon on the home screen is currently not functional because its `onPress` handler is empty. This task involves creating a `NotificationsScreen` and linking it to the bell icon.

## User Review Required

> [!NOTE]
> There is currently no `notifications` table in the database. I will implement a `NotificationsScreen` with an empty state and placeholder content. This provides the UI infrastructure for future notification integration.

## Proposed Changes

### Navigation

#### [navigation.ts](file:///Users/media/Desktop/gather-app/src/types/navigation.ts)

- Add `Notifications: undefined` to `HomeStackParamList`.

#### [MainNavigator.tsx](file:///Users/media/Desktop/gather-app/src/navigation/MainNavigator.tsx)

- Import `NotificationsScreen` (to be created).
- Add `HomeStack.Screen` for `Notifications` in `HomeStackNavigator`.

---

### Screens

#### [NEW] [NotificationsScreen.tsx](file:///Users/media/Desktop/gather-app/src/screens/home/NotificationsScreen.tsx)

- Create a new screen that displays a list of notifications.
- Use `EmptyState` component if no notifications are found.
- Implement a simple "All caught up" message for now.

#### [HomeScreen.tsx](file:///Users/media/Desktop/gather-app/src/screens/home/HomeScreen.tsx)

- Update the bell icon's `onPress` to navigate to the `Notifications` screen:
```tsx
<TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
```

---

## Verification Plan

### Automated Tests
- I will run `npm run lint` to ensure no new linting errors are introduced.
- I will verify that the navigation type `Notifications` is correctly recognized.

### Manual Verification
- I will use `render_compose_preview` (or equivalent if available for RN, but since it's not, I'll rely on static analysis and code review) to verify the UI of the new `NotificationsScreen`.
- I will verify that clicking the bell icon on the home screen successfully navigates to the new `NotificationsScreen`.
- I will verify that the "Back" button on the `NotificationsScreen` works correctly.
