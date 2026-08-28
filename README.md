# Gather App — The Wealth Reality Church
### Warri, Delta State, Nigeria

A React Native (Expo) church community app built with TypeScript, Supabase, and TanStack Query. Features 7 user-selectable colour themes, offline Bible reading, real-time prayer wall, group chat with full admin governance, events, and Paystack giving.

---

## Features

### Auth & Profiles
- Email/password registration with confirm-password validation and strict email regex
- Profile avatars stored in Supabase Storage
- Inline validation on Register and Login screens (no global alerts)

### Bible
- Offline Bible reading (full text bundled)
- Chapter-by-chapter navigation

### Prayer Wall
- Real-time prayer requests and responses via Supabase Realtime
- Submit, react, and respond to requests

### Community & Groups
- Browse all chat groups with search
- Join public groups directly; request to join private groups
- Pending / Joined / Request-sent status badges per group
- **Group Admin System**
	- Admins can edit group profile and about
	- Promote members to admin; remove admin (last-admin safeguard enforced by DB trigger)
	- Accept or reject join requests (private groups)
	- Add members directly
	- Admin badges visible on all member entries
	- Audit log for all 6 admin actions (`group_settings_updated`, `join_request_approved`, `join_request_rejected`, `member_added`, `admin_granted`, `admin_removed`)

### Events
- Upcoming events list with RSVP

### Giving
- Paystack integration for tithes and offerings
- ₦500 minimum gift validation to prevent accidental micro-transactions

### Themes
- 7 user-selectable colour themes persisted via Zustand

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo SDK) |
| Language | TypeScript |
| Backend | Supabase (PostgreSQL + RLS + Realtime) |
| State | Zustand |
| Server state | TanStack Query v5 |
| Navigation | React Navigation v6 |
| Payments | Paystack |

---

## Quick Start

### Prerequisites
```bash
node -v   # 20+
npm -v    # 9+
npm install -g expo-cli eas-cli
```

### Install
```bash
git clone https://github.com/YOUR_ORG/gather-app.git
cd gather-app
npm install
```

### Environment Variables
Copy `.env.example` to `.env` and fill in all `EXPO_PUBLIC_*` values.
> After changing any env var, restart Metro: `npm run start:clear`

### Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run **`database/schema.sql`** (full schema)
3. Run **`database/storage_avatars.sql`** — avatar storage bucket + policies
4. Run **`database/storage_chat_images.sql`** — chat image storage bucket + policies
5. Enable Realtime on tables: `messages`, `message_reactions`, `message_reads`, `prayer_requests`
6. Deploy Supabase Edge Functions from `supabase/functions`.

> For example, install the Supabase CLI and run:
> ```bash
> supabase functions deploy generate-prayer --project-ref <your-project-ref>
> ```
>
> **Existing environments only**: If you already have the base schema deployed, run `database/fix_chat_group_admins.sql` to apply the group admin migration without touching existing data.

### Add Logo
Place your church logo at `assets/logo.png`.

### Run
```bash
npx expo start          # Start Metro
npx expo run:ios        # iOS simulator
npx expo run:android    # Android emulator
```

### Submit to App Stores
```bash
npm run submit:ios
npm run submit:android
npm run submit:all
```

> The `submit:all` command runs both platform submissions in sequence using the existing EAS production profile.

---

## Project Structure

```
src/
	components/     Shared UI components
	constants/      Theme colours, fonts, layout constants
	hooks/          Custom React hooks
	navigation/     Stack and tab navigators
	screens/        All screen components (auth, bible, chat, community, events, giving, prayer)
	services/       Supabase service layer (chatGroups, events, giving, prayers, …)
	store/          Zustand stores (auth, theme, toast)
	types/          TypeScript interfaces and database schema types
	assets/         Images and static assets
database/
	schema.sql                   Full database schema
	fix_chat_group_admins.sql    Migration: group admin system
	storage_avatars.sql          Avatar storage bucket
	storage_chat_images.sql      Chat image storage bucket
	events_seed.sql              Sample events data
```

---

## Support
Built for **The Wealth Reality Church · Warri, Delta State, Nigeria**
*"Where two or three gather in my name, there am I with them." — Matthew 18:20*
