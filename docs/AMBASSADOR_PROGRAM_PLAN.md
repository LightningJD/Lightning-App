# Lightning Ambassador Program (LAP) — Build Plan

**Created**: February 15, 2026
**Purpose**: Step-by-step build plan for the ambassador program features. Every session picks up from the first unchecked `[ ]` step.
**Rule**: One step at a time. Build after every change. Commit after every step. Never skip ahead.

---

## How To Use This Document

1. Read THIS FILE FIRST before doing any ambassador work
2. Find the first unchecked `[ ]` step — that's where to start
3. Read the "What to do" and "Files" sections carefully
4. Execute the step exactly as described
5. Run `npm run build` — if it fails, fix before moving on
6. Change `[ ]` to `[x]` and commit this file along with the code changes
7. If a step fails, add a note under it explaining what happened

---

## Architecture Rules

These rules apply to ALL steps below. Violating them creates the SonarQube issues we're trying to avoid.

1. **Every component under 300 lines** — if it's getting bigger, extract a sub-component
2. **Business logic in hooks, not components** — components only render JSX
3. **No `as any`** — use proper TypeScript types. If you need a type, define it
4. **Use `<button>` not `<div onClick>`** — every clickable element must be a real button
5. **ARIA labels on every icon-only button** — `aria-label="Close"`, `aria-label="Copy link"`, etc.
6. **One hook, one job** — `useAmbassador` handles ambassador state, not message state
7. **Imports from barrel file** — all database functions imported from `src/lib/database`
8. **Test the feature after building it** — tell the user what to test and how

---

## What Already Exists

Before building, understand what's already done:

| Feature | File | Status |
|---------|------|--------|
| Referral codes, QR, share link | `MyReferralSection.tsx` (311 lines) | Built |
| Leaderboard (top 7, BP + OP) | `LeaderboardView.tsx` (251 lines) | Built |
| BP reset cycle + countdown | `referrals.ts` (750 lines) | Built |
| BP reset winner banner | `BpResetBanner.tsx` (118 lines) | Built |
| Ambassador terms modal | `AmbassadorTermsModal.tsx` (193 lines) | Built |
| Anti-fraud device fingerprinting | `referrals.ts` | Built |
| Auto-confirm referral on profile + testimony | `referrals.ts` | Built |
| Ambassador gating (invite-only) | `NearbyTab.tsx`, `ReferralRedirect.tsx` | Built (Feb 15) |
| `/ambassador` invite route | `ReferralRedirect.tsx` | Built (Feb 15) |
| Referral codes only for ambassadors | `users.ts`, `referrals.ts` | Built (Feb 15) |

### What's NOT Built Yet

| Feature | Priority | Complexity |
|---------|----------|------------|
| Extract ambassador UI into its own folder | HIGH | Low |
| `useAmbassador` hook (centralize state) | HIGH | Medium |
| Prize display on leaderboard | MEDIUM | Low |
| Raffle entry tracking | MEDIUM | Medium |
| Raffle drawing mechanism | MEDIUM | Medium |
| Parental consent for under-18 | LOW | Low |
| Admin controls for ambassador program | LOW | Medium |

---

## PHASE A — Clean Architecture (Do This First)

The existing ambassador code is scattered across NearbyTab, MyReferralSection, and referrals.ts. Before adding features, organize it properly.

### Step A.1 — Create `useAmbassador` Hook

- [ ] **Status**: Not started
- **Files**:
  - Create: `src/hooks/useAmbassador.ts`
- **What to do**:
  - Create a new hook that centralizes ALL ambassador state and logic
  - Move the following into this hook:
    - Ambassador invite check (currently in NearbyTab useEffect lines 82-89)
    - Ambassador terms acceptance handler (currently in NearbyTab lines 91-98)
    - `isAmbassador` boolean (derived from profile)
    - `showAmbassadorInvite` state + setter
    - Referral stats loading (currently duplicated between MyReferralSection and NearbyTab)
    - Points loading (BP, OP)
    - Cycle end time / countdown
    - Leaderboard data loading
  - The hook should return a clean interface:
    ```typescript
    interface UseAmbassadorReturn {
      isAmbassador: boolean;
      isLoading: boolean;
      showInviteModal: boolean;
      acceptInvite: () => Promise<void>;
      dismissInvite: () => void;
      stats: { code: string | null; confirmed: number; pending: number };
      points: { bp: number; op: number };
      countdown: string;
      leaderboard: LeaderboardData | null;
      refreshLeaderboard: () => Promise<void>;
    }
    ```
  - Import from `src/lib/database` — do NOT import from referrals.ts directly
- **Test**: Ambassador section still appears for ambassadors on Find page, still hidden for non-ambassadors
- **Risk**: Low — moving logic, not changing it

### Step A.2 — Create `src/components/ambassador/` Folder & Move Components

- [ ] **Status**: Not started
- **Files**:
  - Move: `AmbassadorTermsModal.tsx` → `src/components/ambassador/AmbassadorTermsModal.tsx`
  - Move: `MyReferralSection.tsx` → `src/components/ambassador/ReferralCard.tsx` (rename for clarity)
  - Move: `LeaderboardView.tsx` → `src/components/ambassador/LeaderboardView.tsx`
  - Move: `BpResetBanner.tsx` → `src/components/ambassador/BpResetBanner.tsx`
  - Create: `src/components/ambassador/index.ts` (barrel export)
  - Update: All import paths in NearbyTab.tsx, App.tsx, and anywhere else these are referenced
- **What to do**:
  - Move files one at a time
  - Update imports after each move
  - Run build after each move to catch broken imports immediately
  - The barrel file should export all components:
    ```typescript
    export { default as AmbassadorTermsModal } from './AmbassadorTermsModal';
    export { default as ReferralCard } from './ReferralCard';
    export { default as LeaderboardView } from './LeaderboardView';
    export { default as BpResetBanner } from './BpResetBanner';
    ```
- **Test**: `npm run build` passes. Ambassador section still works visually.
- **Risk**: None — file moves only

### Step A.3 — Create `AmbassadorSection` Wrapper Component

- [ ] **Status**: Not started
- **Files**:
  - Create: `src/components/ambassador/AmbassadorSection.tsx`
  - Update: `src/components/NearbyTab.tsx`
- **What to do**:
  - Create a single `<AmbassadorSection>` component that contains:
    - The `useAmbassador()` hook call
    - `<ReferralCard>` (was MyReferralSection)
    - The "View Leaderboard" toggle button
    - `<LeaderboardView>` (conditionally shown)
    - `<AmbassadorTermsModal>` (for invite flow)
  - Replace the entire ambassador block in NearbyTab (lines 525-561 + 1175-1184) with:
    ```tsx
    <AmbassadorSection nightMode={nightMode} />
    ```
  - Also replace the BpResetBanner conditional with a version inside AmbassadorSection
  - This should remove ~80 lines from NearbyTab
  - `AmbassadorSection.tsx` should be under 150 lines (it's a thin wrapper)
- **Test**: Everything still works. NearbyTab is noticeably shorter.
- **Risk**: Low — extracting JSX into a wrapper

### Step A.4 — Refactor `ReferralCard` to Use `useAmbassador` Hook

- [ ] **Status**: Not started
- **Files**:
  - Update: `src/components/ambassador/ReferralCard.tsx`
- **What to do**:
  - Currently `MyReferralSection` (now ReferralCard) loads its own data with 4 parallel API calls
  - Remove the internal data loading — get all data from `useAmbassador()` via props or context
  - ReferralCard becomes a pure display component:
    - Receives: `stats`, `points`, `countdown`, `nightMode`
    - Renders: referral code, QR, copy button, share button, points cards
    - No `useEffect`, no API calls, no internal state except UI toggles (showQR, copied)
  - The terms modal flow stays in AmbassadorSection (already moved in A.3)
- **Test**: Referral card displays correctly. Copy, QR, and share buttons work.
- **Risk**: Low — props instead of internal state

### Phase A Completion
- [ ] All 4 steps checked off
- [ ] `npm run build` succeeds
- [ ] NearbyTab.tsx is under 1,100 lines (down from 1,221)
- [ ] Ambassador folder has clean separation: `ambassador/` with 5-6 files
- [ ] Single `useAmbassador` hook owns all ambassador state
- [ ] Commit with message: `refactor: extract ambassador UI into dedicated folder with useAmbassador hook`

---

## PHASE B — Prize Display & Program Info

### Step B.1 — Define Prize Configuration

- [ ] **Status**: Not started
- **Files**:
  - Create: `src/lib/ambassadorConfig.ts`
- **What to do**:
  - Create a simple config file that defines the ambassador program parameters:
    ```typescript
    export const AMBASSADOR_CONFIG = {
      programName: 'Lightning Ambassador Program (LAP)',
      programStart: '2026-03-01',
      programEnd: '2026-08-31',
      cycleLengthDays: 14,
      prizes: {
        first: { label: '1st Place', reward: '$50 + Ruelle Clothing', emoji: '' },
        second: { label: '2nd Place', reward: '$25', emoji: '' },
        third: { label: '3rd Place', reward: 'Ruelle Item', emoji: '' },
      },
      raffle: {
        enabled: true,
        freeEntriesPerCycle: 1,
        bonusEntryForTestimony: true,
        bonusEntryForProfile: true,
      },
    } as const;
    ```
  - This makes prizes easy to change without touching components
  - No database changes needed — this is a static config
- **Test**: File exists, exports correctly
- **Risk**: None — new file, no dependencies

### Step B.2 — Add Prize Display to Leaderboard

- [ ] **Status**: Not started
- **Files**:
  - Update: `src/components/ambassador/LeaderboardView.tsx`
  - Import: `AMBASSADOR_CONFIG` from `src/lib/ambassadorConfig.ts`
- **What to do**:
  - Add a small prize badge next to rank 1, 2, 3 in the BP leaderboard column
  - Example: next to the 1st place row, show a subtle tag: "$50 + Ruelle"
  - Only show prizes on the BP column (BP resets biweekly, that's the competition)
  - OP column stays as-is (lifetime points, no prizes)
  - Keep it subtle — a small text label or pill badge, not a giant banner
  - Read prizes from `AMBASSADOR_CONFIG.prizes`
- **Test**: Leaderboard shows prize labels next to top 3. OP column unchanged.
- **Risk**: None — visual addition only

### Step B.3 — Create Program Info Card

- [ ] **Status**: Not started
- **Files**:
  - Create: `src/components/ambassador/ProgramInfoCard.tsx`
  - Update: `src/components/ambassador/AmbassadorSection.tsx`
- **What to do**:
  - Create a collapsible info card that shows:
    - Program name and duration ("March 1 - August 31, 2026")
    - How points work: "Invite friends → they complete profile + testimony → you earn 1 BP + 1 OP"
    - Prize breakdown (from config)
    - Rules summary (link to full terms)
  - Add this to AmbassadorSection, below the referral card
  - Collapsed by default (just shows "Program Info" with expand chevron)
  - Keep it under 150 lines
- **Test**: Info card appears, expands/collapses, shows correct prizes
- **Risk**: None — new display component

### Phase B Completion
- [ ] All 3 steps checked off
- [ ] `npm run build` succeeds
- [ ] Prize config is centralized in one file
- [ ] Leaderboard shows prizes next to top 3
- [ ] Program info is accessible to ambassadors
- [ ] Commit with message: `feat: add prize display and program info to ambassador section`

---

## PHASE C — Raffle System

### Step C.1 — Raffle Database Schema

- [ ] **Status**: Not started
- **Files**:
  - Create: `supabase/migrations/YYYYMMDD_add_raffle_system.sql`
- **What to do**:
  - Create `raffle_entries` table:
    ```sql
    CREATE TABLE raffle_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      cycle_id UUID NOT NULL REFERENCES bp_cycles(id),
      entry_type TEXT NOT NULL CHECK (entry_type IN ('free', 'profile_bonus', 'testimony_bonus')),
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, cycle_id, entry_type)
    );
    ```
  - Create `raffle_draws` table:
    ```sql
    CREATE TABLE raffle_draws (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cycle_id UUID NOT NULL REFERENCES bp_cycles(id),
      winner_id UUID REFERENCES users(id),
      winner_display_name TEXT,
      winner_username TEXT,
      total_entries INTEGER NOT NULL DEFAULT 0,
      drawn_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(cycle_id)
    );
    ```
  - Enable RLS on both tables
  - Add RLS policies:
    - `raffle_entries`: users can read their own entries, insert their own entries
    - `raffle_draws`: all ambassadors can read (to see winners)
- **Test**: Run migration in Supabase SQL Editor. Tables exist with correct constraints.
- **Risk**: Low — new tables, no existing data affected

### Step C.2 — Raffle Database Functions

- [ ] **Status**: Not started
- **Files**:
  - Update: `src/lib/database/referrals.ts` (add raffle functions at the bottom)
  - Update: `src/lib/database/index.ts` (export new functions)
- **What to do**:
  - Add these functions:
    - `claimFreeRaffleEntry(userId, cycleId)` — claims the 1 free entry per cycle
    - `getUserRaffleEntries(userId, cycleId)` — returns list of entries for current cycle
    - `getRaffleTotalEntries(cycleId)` — count of all entries for a cycle
    - `drawRaffleWinner(cycleId)` — weighted random pick, records in raffle_draws
    - `getRaffleWinner(cycleId)` — get the winner for a completed cycle
  - Each function should be 20-40 lines max
  - Proper error handling, no `as any`
  - Export all from barrel file
- **Test**: Functions exist and compile. Build passes.
- **Risk**: Low — new functions, no existing code modified

### Step C.3 — Raffle Entry UI

- [ ] **Status**: Not started
- **Files**:
  - Create: `src/components/ambassador/RaffleEntryCard.tsx`
  - Update: `src/components/ambassador/AmbassadorSection.tsx`
  - Update: `src/hooks/useAmbassador.ts` (add raffle state)
- **What to do**:
  - Create a card that shows:
    - "Raffle" header
    - Free entry button: "Claim Free Entry" (disabled if already claimed)
    - Entry count: "You have X entries this cycle"
    - Bonus entries: checkmarks for profile completion and testimony
    - Last cycle winner (if any)
  - Add raffle state to `useAmbassador` hook:
    - `raffleEntries: RaffleEntry[]`
    - `canClaimFreeEntry: boolean`
    - `claimFreeEntry: () => Promise<void>`
    - `lastRaffleWinner: { name: string; username: string } | null`
  - Add RaffleEntryCard to AmbassadorSection
  - Keep component under 150 lines
- **Test**: Card shows, free entry button works, entry count updates
- **Risk**: Low — new component with simple state

### Step C.4 — Auto-Award Bonus Raffle Entries

- [ ] **Status**: Not started
- **Files**:
  - Update: `src/lib/database/referrals.ts` (modify `checkAndConfirmReferral`)
  - Update: `src/lib/database/testimonies.ts` (modify `createTestimony`)
- **What to do**:
  - When a referral is confirmed and the referrer gets points, also check if they should get a testimony_bonus raffle entry
  - When a user creates their first testimony, if they're an ambassador, give them a testimony_bonus raffle entry for the current cycle
  - These are automatic — no user action needed beyond what they already do
  - Check `AMBASSADOR_CONFIG.raffle.bonusEntryForTestimony` before awarding
- **Test**: Create a testimony as ambassador → raffle entry count increases
- **Risk**: Medium — modifying existing functions. Test carefully.

### Phase C Completion
- [ ] All 4 steps checked off
- [ ] `npm run build` succeeds
- [ ] Raffle entries can be claimed and tracked
- [ ] Bonus entries auto-awarded
- [ ] Raffle winner can be drawn (admin function)
- [ ] Commit with message: `feat: add raffle system with free entries, bonus entries, and draw mechanism`

---

## PHASE D — Parental Consent & Admin Controls

### Step D.1 — Add Parental Consent to Ambassador Terms

- [ ] **Status**: Not started
- **Files**:
  - Update: `src/components/ambassador/AmbassadorTermsModal.tsx`
  - Update: `src/lib/database/referrals.ts` (add `parental_consent` field)
  - Create: `supabase/migrations/YYYYMMDD_add_parental_consent.sql`
- **What to do**:
  - Add migration: `ALTER TABLE users ADD COLUMN parental_consent_at TIMESTAMPTZ;`
  - Add a checkbox at the bottom of the ambassador terms modal:
    - "I confirm I am 18+ or have parental/guardian consent to participate"
    - Cannot proceed without checking it
  - When accepting terms, also record `parental_consent_at`
  - Update `acceptAmbassadorTerms` to accept a `parentalConsent: boolean` parameter
- **Test**: Terms modal shows checkbox. Can't accept without checking it. Field saved to DB.
- **Risk**: Low — additive change to existing modal

### Step D.2 — Ambassador Admin Panel

- [ ] **Status**: Not started
- **Files**:
  - Create: `src/components/ambassador/AmbassadorAdmin.tsx`
  - Update: `src/components/AdminDashboard.tsx` (add ambassador tab)
  - Update: `src/hooks/useAmbassador.ts` (add admin functions)
- **What to do**:
  - Create an admin panel (only visible to app admins) with:
    - Current cycle info (start date, end date, time remaining)
    - List of all ambassadors (name, points, referral count)
    - "Draw Raffle Winner" button (calls `drawRaffleWinner`)
    - "Force BP Reset" button (calls `executeBpReset`)
    - Last raffle winner display
    - Total program stats (ambassadors count, total referrals, total entries)
  - Add this as a tab/section inside the existing AdminDashboard
  - Keep under 250 lines — it's a simple data display + 2 action buttons
- **Test**: Admin can see ambassador list, trigger raffle draw, force BP reset
- **Risk**: Low — admin-only feature, doesn't affect regular users

### Step D.3 — Raffle Drawing Integration with BP Reset

- [ ] **Status**: Not started
- **Files**:
  - Update: `src/lib/database/referrals.ts` (modify `executeBpReset`)
  - Update: `src/components/ambassador/BpResetBanner.tsx` (show raffle winner too)
- **What to do**:
  - When `executeBpReset` runs (biweekly cycle ends):
    1. Snapshot top 3 winners (already done)
    2. Draw raffle winner automatically (new)
    3. Reset BP to 0 (already done)
    4. Create new cycle (already done)
  - Update BpResetBanner to also show the raffle winner alongside the top 3
  - Format: "Top 3: [names] | Raffle Winner: [name]"
- **Test**: After BP reset, banner shows both top 3 and raffle winner
- **Risk**: Medium — modifying the BP reset function. Test the full cycle.

### Phase D Completion
- [ ] All 3 steps checked off
- [ ] `npm run build` succeeds
- [ ] Parental consent required for ambassador signup
- [ ] Admin can manage ambassador program
- [ ] Raffle draws automatically with BP reset
- [ ] Commit with message: `feat: add parental consent, admin controls, and integrated raffle drawing`

---

## Progress Tracker

| Phase | Description | Steps | Status | Date Completed |
|-------|------------|-------|--------|----------------|
| A | Clean Architecture | 4 | Not started | |
| B | Prize Display & Info | 3 | Not started | |
| C | Raffle System | 4 | Not started | |
| D | Consent & Admin | 3 | Not started | |

**Total steps**: 14
**Estimated sessions**: 4-6 (one phase per session)

---

## Pre-Work Already Completed (Feb 15, 2026)

These changes were made before this plan was created:

- [x] Ambassador UI gated behind `ambassador_terms_accepted_at` check
- [x] `/ambassador` invite route created (ReferralRedirect.tsx)
- [x] Referral codes no longer auto-generated for all users
- [x] Referral codes generated on ambassador terms acceptance
- [x] Non-ambassadors see nothing on Find page

---

## Code Quality Checklist (Check Before Every Commit)

Use this checklist before marking any step as done:

- [ ] `npm run build` passes
- [ ] No component over 300 lines
- [ ] No `as any` in new code
- [ ] All clickable elements are `<button>` with `aria-label`
- [ ] Business logic in hooks, not components
- [ ] New functions have JSDoc comments
- [ ] Imports use barrel file (`src/lib/database`), not direct file paths
- [ ] Tell the user what to test and how

---

## Notes for Future Claude Sessions

1. **Read this file and `docs/REFACTORING_PLAN.md`** before doing any work
2. **This is a 6-month program** (March - August 2026) — keep it simple
3. **~100-300 ambassadors** — no need for heavy optimization
4. **The user does not code** — explain changes in plain English
5. **Invite-only** — no public discovery of the ambassador program
6. **Prizes are small** — $50/$25/Ruelle clothing. Not a sweepstakes, just a community program
7. **App is live at**: https://lightning-dni.pages.dev
8. **Ambassador invite URL**: `https://lightning-dni.pages.dev/ambassador`
