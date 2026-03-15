# Blocking & Reporting — Research & Implementation Plan

**Date**: March 8, 2026
**Status**: Research complete — ready for implementation
**Confidence**: HIGH — all infrastructure already exists, gaps are well-defined

---

## Executive Summary

Blocking and reporting are **80% built**. The database tables, database modules, and key UI components all exist. What's missing is:
1. **Gaps in blocking enforcement** (search results, friend requests, notifications)
2. **The `reports` table may not exist in production** (migration exists but unclear if deployed)
3. **No admin moderation dashboard** (backend functions exist, no UI)
4. **Minor UX gaps** in the report flow

---

## What Already Exists

### Database Layer (100% Complete)

| Component | File | Status |
|-----------|------|--------|
| `blocked_users` table | `supabase/migrations/add_privacy_notification_settings.sql:25` | Migration exists |
| `reports` table | `supabase/migrations/add_privacy_notification_settings.sql:42` | Migration exists |
| `blockUser()` | `src/lib/database/blocking.ts:25` | Working |
| `unblockUser()` | `src/lib/database/blocking.ts:63` | Working |
| `getBlockedUsers()` | `src/lib/database/blocking.ts:90` | Working |
| `isUserBlocked()` | `src/lib/database/blocking.ts:141` | Working |
| `isBlockedBy()` | `src/lib/database/blocking.ts:172` | Working |
| `getBlockedUserIds()` | `src/lib/database/blocking.ts:202` | Working (efficient batch, 2 queries) |
| `reportUser()` | `src/lib/database/reporting.ts:8` | Working (has `@ts-ignore`) |
| `reportTestimony()` | `src/lib/database/reporting.ts:41` | Working |
| `reportMessage()` | `src/lib/database/reporting.ts:75` | Working |
| `reportGroup()` | `src/lib/database/reporting.ts:109` | Working |
| `hasUserReported()` | `src/lib/database/reporting.ts:167` | Working |
| `getReportsByUser()` | `src/lib/database/reporting.ts:142` | Working |
| `getAllReports()` | `src/lib/database/reporting.ts:247` | Working (admin) |
| `getReportCounts()` | `src/lib/database/reporting.ts:287` | Working (admin) |
| `updateReportStatus()` | `src/lib/database/reporting.ts:323` | Working (admin) |
| `REPORT_REASONS` | `src/lib/database/reporting.ts:205` | Complete (user/testimony/message/group) |

### UI Components (90% Complete)

| Component | File | Status |
|-----------|------|--------|
| `BlockedUsers` modal | `src/components/BlockedUsers.tsx` | Working — shows blocked list, unblock button |
| `ReportContent` modal | `src/components/ReportContent.tsx` | Working — reason picker, details text, submit |
| Block button on profile | `src/components/ProfileTab.tsx:601` | Working — block/unblock toggle |
| Report button on profile | `src/components/ProfileTab.tsx` | Needs verification |
| Block check in DMs | `src/hooks/useMessages.ts` | Working — filters conversations + blocks sending |

### RLS Policies

| Table | RLS Status |
|-------|-----------|
| `blocked_users` | Enabled with proper policies (batch 6 migration) |
| `reports` | Enabled with proper policies (batch 6 migration) |

---

## Gaps to Fill (Implementation Tasks)

### Gap 1: Search/Discovery Doesn't Filter Blocked Users
**Severity**: Medium
**Location**: `src/components/NearbyTab.tsx`, `src/lib/database/users.ts`

Currently `searchUsers()` and `findNearbyUsers()` return ALL users including ones the current user has blocked (or who have blocked them). Blocked users should be excluded from:
- User search results
- Nearby users discovery
- "People you may know" suggestions (if exists)

**Fix approach**: After fetching search results, filter against `getBlockedUserIds()`. The efficient batch function already exists — just needs to be called in the NearbyTab component or search hook.

### Gap 2: Friend Requests Not Blocked
**Severity**: Medium
**Location**: `src/lib/database/friends.ts:28`

`sendFriendRequest()` doesn't check if either user has blocked the other. A blocked user could still send a friend request.

**Fix approach**: Add a block check at the beginning of `sendFriendRequest()`. If either direction is blocked, return an error.

### Gap 3: No Duplicate Report Prevention in UI
**Severity**: Low
**Location**: `src/components/ReportContent.tsx`

The `hasUserReported()` function exists in the database module but is never called in the UI. Users can submit duplicate reports.

**Fix approach**: Call `hasUserReported()` when opening the report dialog. If already reported, show "You've already reported this content" instead of the form.

### Gap 4: Report Button Accessibility in More Contexts
**Severity**: Low
**Location**: Various components

Report buttons exist on user profiles but may be missing from:
- Long-press/right-click on messages (in DMs and group chat)
- Testimony cards in the feed
- Group info panels

**Fix approach**: Add "Report" option to existing context menus / action sheets where they exist.

### Gap 5: No Admin Moderation Dashboard
**Severity**: Low (for users) / Medium (for operations)
**Location**: None — needs new component

All admin functions exist (`getAllReports`, `getReportCounts`, `updateReportStatus`) but there's no UI to use them. This would be a settings panel visible only to admin users.

**Fix approach**: Create an `AdminReports` component similar to `BlockedUsers` modal. Gate behind admin role check.

### Gap 6: Blocking Doesn't Remove Existing Friend Connection
**Severity**: Medium
**Location**: `src/components/ProfileTab.tsx:216`

When a user blocks someone, `handleBlockUser` calls `blockUser()` but doesn't also call `unfriendUser()`. The blocked person remains in the friends list even though they're blocked.

**Fix approach**: In `handleBlockUser`, also call `unfriendUser()` if a friendship exists. Check `friendStatus` state before blocking.

### Gap 7: Reports Table Type Safety
**Severity**: Low
**Location**: `src/lib/database/reporting.ts`

The file has `@ts-nocheck` at the top and multiple `@ts-ignore` comments because the `reports` table isn't in the auto-generated Supabase types. The types exist manually in `src/types/index.ts:297` but aren't being used.

**Fix approach**: Remove `@ts-nocheck`, import `Report` type from `src/types`, add proper typing.

---

## Recommended Implementation Order

### Phase 1 — Critical Enforcement (1 session)
1. **Gap 6**: Block also unfriends (surgical fix in ProfileTab.tsx, ~5 lines)
2. **Gap 2**: Friend request block check (surgical fix in friends.ts, ~10 lines)
3. **Gap 1**: Filter blocked users from search/discovery (NearbyTab.tsx, ~15 lines)

### Phase 2 — UX Polish (1 session)
4. **Gap 3**: Duplicate report prevention (ReportContent.tsx, ~15 lines)
5. **Gap 4**: Report buttons in more contexts (per-context, ~10 lines each)
6. **Gap 7**: Type safety cleanup (reporting.ts, mechanical)

### Phase 3 — Admin Tools (1 session)
7. **Gap 5**: Admin moderation dashboard (new component, ~200-300 lines)

---

## Database Schema Reference

### `blocked_users` table
```sql
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  UNIQUE(blocker_id, blocked_id)
);
-- Indexes: idx_blocked_users_blocker, idx_blocked_users_blocked
```

### `reports` table
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_testimony_id UUID,
  reported_message_id UUID,
  report_type TEXT NOT NULL CHECK (report_type IN ('user', 'testimony', 'message', 'group')),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id)
);
-- Indexes: idx_reports_status, idx_reports_reporter, idx_reports_reported_user
```

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Blocking database module | `src/lib/database/blocking.ts` |
| Reporting database module | `src/lib/database/reporting.ts` |
| Blocked users UI (settings) | `src/components/BlockedUsers.tsx` |
| Report content dialog | `src/components/ReportContent.tsx` |
| Profile with block/report buttons | `src/components/ProfileTab.tsx` |
| DM blocking enforcement | `src/hooks/useMessages.ts` |
| Friend request logic | `src/lib/database/friends.ts` |
| User search/discovery | `src/components/NearbyTab.tsx` |
| Privacy/visibility checks | `src/lib/database/privacy.ts` |
| Database barrel export | `src/lib/database/index.ts` |
| Types (BlockedUser, Report) | `src/types/index.ts` |
| Table migrations | `supabase/migrations/add_privacy_notification_settings.sql` |

---

## Pre-Requisites Before Implementation

1. **Verify `reports` table exists in production** — The migration file exists but it's unclear if it was deployed. Run a test query against the reports table to confirm.
2. **Verify `blocked_users` table exists in production** — Same concern. The `BlockedUsers` component has error handling that silently catches "relation doesn't exist" errors, suggesting it may not have been deployed.
3. **No new dependencies needed** — Everything uses existing Supabase client and React patterns.
