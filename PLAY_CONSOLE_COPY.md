Google Play (Play Console) — Copy-ready entries

Support Contact:
- alexallwell.am@gmail.com

Data safety form suggested answers:

1) Data collected
- Personal info: Name, email, profile fields — Collected (Yes). Purpose: Account creation, communication. Shared with Supabase.
- Financial info: No (Payments handled by Paystack; card data not stored by app).
- Photos & videos: Yes — When users upload images/messages/events. Purpose: content storage/display. Shared with Supabase storage.
- Device or other IDs: Yes — Device identifiers, app identifiers. Purpose: Analytics, authentication, push notifications. Shared with Supabase and Sentry.
- Diagnostics: Yes — Crash reports and logs. Shared with Sentry.
- Location: No by default (only if `expo-location` or equivalent is enabled).

2) Is data linked to the user? Mostly Yes — account, profile, and uploaded content are linked to user IDs.

3) Is data shared with third-parties? Yes — Supabase, Sentry, Expo, Paystack, OAuth providers (Google/Apple) if used.

4) Purposes (select applicable):
- App functionality: Authentication, account management
- Backend storage: User content and media
- Analytics & Crash Reporting: Sentry/other
- Notifications: Expo notifications
- Payments (third party): Paystack

Short description for Play listing:
“We collect account details (email, name), user-provided content (photos, messages), device identifiers and diagnostics to provide core app features (authentication, content storage, notifications, and app stability). Backend services include Supabase (storage/auth) and Sentry (crash reporting). Payments are processed by Paystack; the app does not store payment card details.”

Instructions:
- Use the bullets above to complete the Play Console Data safety form.
- Confirm any additional SDKs (analytics, ads) and update the form/policy accordingly.

Legal note: Have counsel review for GDPR/CCPA compliance where required.
