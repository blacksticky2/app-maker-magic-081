# FamilyHub — Build Plan

A modern web app for Pakistani families to manage inventory, fuel, chores, rewards, chat, and notifications together. Built as a responsive web app (works on phones via browser) on TanStack Start + React + Tailwind, backed by Lovable Cloud (Postgres + Auth + Realtime + Storage).

> Note on your brief: Lovable produces web apps, not native APKs, Next.js, or Firebase. So we'll use TanStack Start (React + Vite) and Lovable Cloud (managed Supabase). The app will be fully responsive and installable as a PWA on Android/iPhone home screens.

---

## Design direction (default)

- Warm, modern, glassmorphic. Soft gradients (teal → coral) with frosted cards.
- Light + dark mode, smooth Motion-based transitions, animated loaders.
- Distinctive typography (display: Space Grotesk, body: DM Sans).
- Mobile-first responsive layout; collapsible sidebar on desktop, bottom tab bar on mobile.

---

## Build order (staged commits so you can review as we go)

### Stage 1 — Foundation
- Enable Lovable Cloud.
- Design system: tokens in `styles.css`, dark/light theme, gradients, glass utility classes, animated loader, page transitions.
- App shell: responsive sidebar (desktop) + bottom nav (mobile), top bar with profile/notifications.
- Auth: email + password + Google sign-in. Signup captures username (unique), email, password, optional avatar. `profiles` table + trigger. `_authenticated` route guard.

### Stage 2 — Family system
- Tables: `families`, `family_members` (role enum + custom roles), `family_invites`.
- Create family (creator → admin), upload family banner/avatar.
- Search users by username/email, send invites, accept/decline.
- Family switcher in sidebar (a user can belong to multiple families).
- Role management UI (Dad/Mom/Brother/Sister/Grandparents/Uncle/Aunt/Cousin/custom; renameable).

### Stage 3 — Inventory + Fuel
- Tables: `inventory_categories`, `inventory_items` (name, qty, unit, low_stock_threshold, category, notes, expiry, updated_by, family_id), `inventory_history`.
- Seed preset catalog: vegetables, fruits, grains (rice/flour), dairy (milk/eggs), meat, spices, drinks, snacks, cooking oil, cleaning, basic medicine, LPG, household.
- Add/edit/delete items, quick +/− adjusters, search & filter by category.
- Fuel module: `vehicles` (bike/car/custom) + `fuel_logs` (refill, cost, liters, odometer optional). Current level, refill history, cost charts, low-fuel threshold.
- Realtime low-stock + empty-stock alerts via Postgres triggers → `notifications` table → Realtime subscription.

### Stage 4 — Chores + Rewards (gamified)
- Tables: `chores` (title, description, points, status, created_by, assigned_to, proof_url, family_id), `chore_events` (accepted/started/completed/approved/rejected).
- Post a chore, accept it, mark complete, upload photo proof (Storage), approve/reject with comments.
- Points credited on approval → `profiles.points`.
- Rewards: admin-configurable points→PKR conversion (default 100pts = 100 PKR).
- Leaderboard: weekly / monthly / all-time, "most active member".

### Stage 5 — Chat + DMs
- Tables: `conversations` (group=family or dm), `conversation_members`, `messages` (text, image_url, reply_to_id, read_by[]).
- Realtime via Supabase Realtime: typing indicators, read receipts, image sharing (Storage), emoji, reply threading.
- Family group chat auto-created per family. DMs between any two family members.

### Stage 6 — Notifications + Settings + Polish
- Notification center (bell): low/empty stock, chore events, invites, new messages, fuel alerts. Mark-as-read, filter by type, sound toggle.
- Settings: theme (dark/light/system), accent color picker, notification preferences, language placeholder (EN/UR ready), profile edit, change password, leave family.
- Profile page: avatar, role, points balance, completed chores count, activity feed.
- Dashboard: at-a-glance cards (low stock, fuel status, pending chores, leaderboard preview, recent chat).

### Stage 7 — PWA + final QA
- `manifest.webmanifest` + service worker for installability + offline shell.
- Responsive QA at 360/411/768/1280, dark/light, empty/loaded states.
- Security pass: RLS policies on every table scoped to `family_members`, `has_role()` security-definer function for admin checks.

---

## Technical details

- **Routing**: TanStack Start file routes. Public: `/`, `/login`, `/signup`. Protected under `_authenticated/`: `/dashboard`, `/inventory`, `/fuel`, `/chores`, `/rewards`, `/chat`, `/dm/$userId`, `/notifications`, `/family`, `/family/invite`, `/settings`, `/profile/$username`.
- **DB**: Postgres via Lovable Cloud. RLS on; `family_id` scoping on every family-owned row. `app_role` enum + `user_roles` table (admin within a family) using security-definer `has_role(_user_id, _family_id, _role)` to avoid recursive RLS.
- **Realtime**: Supabase Realtime channels for messages, notifications, inventory changes.
- **Storage buckets**: `avatars` (public), `family-banners` (public), `chore-proofs` (private), `chat-media` (private with signed URLs).
- **Server functions**: `createServerFn` with `requireSupabaseAuth` for mutations needing privileged checks (approve chore, send invite, redeem reward).
- **Triggers**: on `inventory_items` update → enqueue notifications when qty crosses `low_stock_threshold` or hits 0; on `chore_events` insert (approved) → credit points.
- **State/data**: TanStack Query for fetching, Realtime subscriptions for live updates.
- **No native push** (web only). In-app + browser Notifications API toast where supported.

---

## What you'll get

A production-ready responsive web app covering the full FamilyHub spec, themed with dark/light glassmorphism, installable as a PWA. Native APK can be produced later by wrapping with PWABuilder/Capacitor — not part of this build.

I'll commit after each stage so you can review and request changes between stages rather than at the very end.