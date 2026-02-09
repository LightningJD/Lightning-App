# RLS Policy Matrix — Lightning App

**Created**: Feb 9, 2026
**Purpose**: Define row-level security rules for all 47 tables before writing SQL
**Auth Model**: Clerk JWT → Supabase. `auth.uid()` returns Clerk user ID (text).
**Identity Lookup**: All policies use a helper function to map Clerk ID → Supabase UUID:
```sql
CREATE OR REPLACE FUNCTION get_user_id() RETURNS uuid AS $$
  SELECT id FROM public.users WHERE clerk_user_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

---

## Legend

- **owner** = `user_id = get_user_id()` (the row belongs to the current user)
- **authed** = any authenticated user (`auth.uid() IS NOT NULL`)
- **participant** = sender or recipient of a message
- **member** = member of the group/server referenced by the row
- **admin** = has admin/owner role in the group/server
- **public** = no auth required (anon key can read)
- **none** = operation not allowed via client
- **service** = only via service role key (server-side functions)

---

## 1. USER TABLES

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **users** | public (all profiles browsable) | service (created on signup sync) | owner | none (deactivate instead) |
| **blocked_users** | owner (blocker_id) | owner (blocker_id) | none | owner (blocker_id) |
| **device_fingerprints** | owner (user_id) | owner (user_id) | none | none |

---

## 2. SOCIAL TABLES

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **friendships** | participant (user1 or user2) | authed (send request) | participant (accept/decline) | participant (unfriend) |
| **followers** | public | authed | none | owner (follower_id) |

---

## 3. MESSAGING TABLES

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **messages** | participant (sender or recipient) | authed (sender_id = self) | owner (sender_id, for edits) | owner (sender_id) |
| **message_reactions** | participant (of parent message) | participant (of parent message) | none | owner (user_id) |
| **notifications** | owner (user_id) | service | owner (mark read) | owner (user_id) |

---

## 4. GROUP TABLES

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **groups** | public (discovery) + private (members only) | authed (create) | admin (creator/admin role) | admin (creator only) |
| **group_members** | member (of group) | admin (add) or authed (join public) | admin (change role) | admin (kick) or owner (leave) |
| **group_messages** | member (of group) | member (of group) | owner (sender_id) | owner (sender_id) or admin |
| **join_requests** | owner (user_id) or admin (of group) | authed (request to join) | admin (approve/deny) | owner (cancel) |
| **group_events** | member (of group) | admin | admin | admin |
| **event_rsvps** | member (of group) | member (of group) | owner (user_id) | owner (user_id) |
| **event_messages** | member (of group via event) | member (of group via event) | owner (user_id) | owner (user_id) or admin |

---

## 5. SERVER TABLES

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **servers** | public (discovery) | authed (create) | admin (owner role) | admin (owner role) |
| **server_members** | member (of server) | admin or authed (join) | admin (change role) | admin (kick) or owner (leave) |
| **server_roles** | member (of server) | admin | admin | admin (not owner role) |
| **server_role_permissions** | member (of server) | admin | admin | admin |
| **server_categories** | member (of server) | admin (manage_channels perm) | admin | admin |
| **server_channels** | member (of server, respecting private channel access) | admin (manage_channels) | admin | admin |
| **channel_role_access** | member (of server) | admin | admin | admin |
| **channel_messages** | member (of server, with channel access) | member (with send_messages perm) | owner (sender_id) | owner or admin (delete_messages perm) |
| **channel_message_reactions** | member (of server) | member (of server) | none | owner (user_id) |
| **channel_read_receipts** | owner (user_id) | owner (user_id) | owner (user_id) | none |
| **channel_typing_indicators** | member (of server) | member (of server) | member (of server) | member (of server) |
| **server_join_requests** | owner (user_id) or admin (of server) | authed | admin (approve/deny) | owner (cancel) |

---

## 6. CONTENT TABLES (Testimonies)

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **testimonies** | visibility-based (my_church / all_churches / shareable) | authed (owner) | owner (user_id) | owner (user_id) |
| **testimony_likes** | authed (viewer of testimony) | authed | none | owner (user_id, unlike) |
| **testimony_views** | owner (testimony author) | authed (system tracks) | none | none |
| **testimony_comments** | viewer of testimony | authed (viewer of testimony) | owner (user_id) | owner or testimony author |
| **testimony_generations** | owner (user_id) | service | none | service |

---

## 7. CHURCH TABLES

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **churches** | public (discovery) | authed (create) | admin (created_by) | admin (created_by) |

---

## 8. REFERRAL & GAMIFICATION TABLES

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **referrals** | owner (referrer or referred) | service | service | none |
| **leaderboard_cache** | public | service | service | service |
| **bp_cycles** | public | service | service | none |
| **bp_reset_dismissals** | owner (user_id) | owner (user_id) | none | none |

---

## 9. BILLING & SUBSCRIPTION TABLES

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **subscriptions** | owner (user_id) | service (Stripe webhook) | service | none |
| **subscription_events** | service | service | none | none |
| **pricing_tiers** | public | service | service | service |
| **premium_cosmetics** | public (catalog) | service | service | service |
| **individual_pro_cosmetics** | owner (user_id) | service | service | service |
| **member_count_snapshots** | service | service | none | service |

---

## 10. MODERATION & SYSTEM TABLES

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **reports** | service (admin dashboard) | authed (file report) | service (resolve) | service |
| **announcements** | authed (targeted users) | service (admin) | service | service |
| **announcement_receipts** | owner (user_id) | owner (user_id) | owner (mark read) | none |
| **spatial_ref_sys** | none (PostGIS internal) | none | none | none |

---

## Implementation Notes

### Helper Functions Needed
1. **`get_user_id()`** — Maps `auth.uid()` (Clerk ID) → Supabase UUID
2. **`is_group_member(group_id)`** — Checks if current user is a member of the group
3. **`is_server_member(server_id)`** — Checks if current user is a member of the server
4. **`is_server_admin(server_id)`** — Checks if current user has admin/owner role in server
5. **`has_server_permission(server_id, permission_name)`** — Checks role-based permission
6. **`can_view_testimony(testimony_id)`** — Checks visibility rules (church, friends, public)

### Rollout Order (safest first)
1. `users` — simplest ownership model
2. `blocked_users` — simple owner-based
3. `friendships` — participant-based
4. `followers` — public read, simple write
5. `testimonies` + related (likes, views, comments) — visibility rules
6. `messages` + `message_reactions` — participant-based
7. `groups` + related — member-based
8. `servers` + related — role-permission-based (most complex)
9. `churches`, `referrals`, `billing` — mostly service-only
10. `reports`, `announcements` — admin/service only

### Tables Safe to Leave RLS-Off (service-only)
These tables are only written by Cloudflare Workers using the service role key:
- `testimony_generations` (analytics)
- `subscription_events` (Stripe webhooks)
- `member_count_snapshots` (background job)
- `spatial_ref_sys` (PostGIS internal)

Even so, enabling RLS with a restrictive SELECT policy is recommended to prevent data leaks.

---

## Pre-Requisites Before Any RLS Work

1. **Clerk JWT Template**: Must be created in Clerk Dashboard with `sub` claim = Clerk user ID
2. **Supabase JWT Secret**: Must be set to Clerk's signing key in Supabase Dashboard → Settings → API
3. **Client Update**: `src/lib/supabase.ts` must pass Clerk JWT on every request
4. **Test**: Verify `auth.uid()` returns the Clerk user ID in a Supabase query
