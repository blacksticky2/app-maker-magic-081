# Manage Families — Full System

A premium, Discord-style family management hub accessible from the profile page, with real-time presence, role-based permissions, invitations, and ownership transfer.

## 1. Profile hub redesign

Restructure `/profile` into 4 tabs:
- **My Families** — quick switcher + cards
- **Manage Families** — full management (this is the big one)
- **Activity Status** — set your status (Online / Idle / Invisible), see who's online across families
- **Family Settings** — current family preferences (notifications, default role, etc.)

Each family card shows: avatar/banner, name, member count, **online count (live)**, your role, last activity timestamp.

## 2. Family management panel

Click a family card → detailed panel with:
- Family header (banner, avatar editable by owner/admin)
- Tabs: **Members**, **Roles & Permissions**, **Invites**, **Danger Zone**
- Member cards show: avatar, @username, display name, role badge, **green/yellow/grey status dot**, "Active now" / "Last seen 5m ago", points, chores completed
- Hover card with full profile preview + quick DM button

## 3. Role & permission system

Three tiers: **Owner** (1) · **Admin** (many) · **Member**

| Capability | Owner | Admin | Member |
|---|---|---|---|
| View family | ✓ | ✓ | ✓ |
| Manage chores/inventory/vehicles | ✓ | ✓ | — |
| Invite / remove members | ✓ | ✓ | — |
| Promote / demote admins | ✓ | — | — |
| Rename family, edit banner | ✓ | ✓ | — |
| Transfer ownership | ✓ | — | — |
| Delete / disband family | ✓ | — | — |
| Leave family | ✓* | ✓ | ✓ |

\*Owner must transfer ownership before leaving.

Admins can also rename custom role labels per member (Dad, Mom, etc.).

## 4. Invite system

- Search bar over `profiles` by username/email
- Result cards: avatar, @username, online dot, last seen, mutual families badge
- Send invite → creates `family_invites` row + notification
- Recipient sees invite in **My Families** with Accept / Decline
- Owner/Admin sees pending invite list with revoke button

## 5. Presence / activity system

Real-time status using Supabase Realtime Presence + a `user_presence` table for "last seen":
- **Online** — actively connected via realtime channel
- **Idle** — no interaction 5 min
- **Offline** — disconnected; show "Last seen Xm ago"
- **Typing** — per-conversation broadcast in chat
- Green dot on avatars throughout app (chat, DMs, member lists, profile)

Heartbeat updates `profiles.last_seen_at` every 60s.

## 6. Leave / Disband / Delete

- **Leave** — any member; owner blocked until ownership transferred
- **Disband / Delete** — owner only; confirmation dialog requiring family name typed
- Cascades: messages, conversations, chores, inventory, vehicles, fuel_logs, invites, notifications, members

## 7. UI/UX

Glass panels, gradient borders, framer-motion stagger animations for member lists, animated status pulse, smooth tab transitions, mobile-first responsive (single column on <640px), sticky action bars.

---

## Technical Notes

**Database migration:**
- Add `profiles.last_seen_at timestamptz`, `profiles.display_name text`, `profiles.status text` (online/idle/offline/invisible)
- Add `families.owner_id uuid` (init from `created_by`)
- Replace boolean `is_admin` semantics with implicit role: owner = `families.owner_id`, admin = `is_admin=true`, member = neither
- New RLS helper `public.is_family_owner(_uid, _fid)`
- Update delete policy on `families` → owner only (not any admin)
- Cascade deletes via `ON DELETE CASCADE` on FKs (chores, inventory_items, vehicles, fuel_logs, conversations→messages, family_invites, family_members, notifications, reward_settings)
- `transfer_ownership(_family_id, _new_owner_id)` security-definer function

**Realtime:**
- Enable realtime on `family_members`, `family_invites`, `profiles`
- Presence channel per family: `family:{id}:presence` tracking `{user_id, status, last_active}`
- Typing channel per conversation: broadcast `typing` events

**Files:**
- `src/routes/_authenticated/profile.tsx` — convert to tabbed hub with `<Outlet />` to subroutes
- `src/routes/_authenticated/profile/manage.tsx` — Manage Families list
- `src/routes/_authenticated/profile/manage.$familyId.tsx` — Family management panel
- `src/routes/_authenticated/profile/status.tsx` — Activity status
- `src/routes/_authenticated/profile/settings.tsx` — Family settings
- `src/hooks/use-presence.tsx` — global presence provider + heartbeat
- `src/hooks/use-family-presence.tsx` — per-family online members
- `src/components/StatusDot.tsx`, `MemberCard.tsx`, `UserSearchDialog.tsx`, `TransferOwnershipDialog.tsx`, `DisbandFamilyDialog.tsx`
- Update `UserAvatar.tsx` to optionally render status dot
- Update existing `family.index.tsx` to redirect/link into new manage flow
- Update chat/DM to show typing + presence

**Permissions enforcement:** all writes gated by RLS using `is_family_owner` / `is_family_admin`; UI hides actions the user can't perform but the DB is the source of truth.

This is a large change (~15 files, 1 migration). Shall I proceed?
