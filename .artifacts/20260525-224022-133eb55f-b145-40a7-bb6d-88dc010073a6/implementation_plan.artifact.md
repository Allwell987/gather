# Resolve Build Errors

Identify and fix 11 TypeScript errors across 4 files to ensure the project builds successfully.

## Proposed Changes

### Hooks

#### [useCreateGroup.ts](file:///Users/media/Desktop/gather-app/src/hooks/useCreateGroup.ts)

- Fix `unknown` error in catch block by casting or using a type-safe error handler.
- Rename properties in `createChatGroup` call to match `CreateChatGroupInput` definition:
    - `about` -> `description`
    - `pictureUrl` -> `displayPictureUrl`

#### [useEventDetail.ts](file:///Users/media/Desktop/gather-app/src/hooks/useEventDetail.ts)

- Resolve `never` type inference for `data` by providing explicit types to the Supabase `select` query or casting the result. This happens because the nested join `event_rsvps(user_id)` is not automatically inferred by the `Database` type.

#### [useUtilities.ts](file:///Users/media/Desktop/gather-app/src/hooks/useUtilities.ts)

- Fix `useRef` errors by providing `undefined` as the initial value to match the expected signature in strict React types.

---

### Screens

#### [EventsScreen.tsx](file:///Users/media/Desktop/gather-app/src/screens/events/EventsScreen.tsx)

- Add `hideHeader` prop to `EventsScreen` and use it to conditionally render the `HeaderBar`, matching its usage in `CommunityScreen.tsx`.

#### [PrayerWallScreen.tsx](file:///Users/media/Desktop/gather-app/src/screens/prayer/PrayerWallScreen.tsx)

- (Verification) Confirmed `hideHeader` is already present, but will ensure it's correctly exported/typed if issues persist.

## Verification Plan

### Automated Tests
- Run `npm run typecheck` to verify that all 11 errors are resolved and no new ones are introduced.

### Manual Verification
- None required as these are build-time TypeScript fixes.
