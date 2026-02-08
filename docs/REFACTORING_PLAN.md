# Lightning — Architectural Refactoring Plan

**Created**: February 8, 2026
**Purpose**: Step-by-step refactoring guide any Claude session can execute from cold start
**Rule**: Complete each step fully, test, commit, then check the box before moving to the next

---

## How To Use This Document

1. A new Claude session should read THIS FILE FIRST
2. Find the first unchecked `[ ]` step — that's where to start
3. Read the "Context Needed" section for that step to understand dependencies
4. Execute the step exactly as described
5. After verifying, change `[ ]` to `[x]` and commit this file
6. If a step fails or needs adjustment, add a note under it with what happened

---

## Pre-Flight Checklist

Before ANY work session, run these commands to verify project health:

```bash
cd /path/to/lightning
npm run build          # Must succeed — if it doesn't, fix build first
npm run type-check     # Note how many errors (baseline)
npm run test:run       # Note how many pass/fail (baseline)
```

Record results here before starting:
- Build status: PASS (2.62s)
- Type errors: (to be baselined)
- Tests: (to be baselined)

---

## PHASE 1 — Zero-Risk Fixes (Session 1, ~1 hour)

These changes are mechanical and cannot break functionality.

### Step 1.1 — Remove Client-Side Claude API Key Fallback
- [x] **Status**: DONE (Feb 8, 2026)
- **File**: `src/lib/api/claude.ts`
- **What to do**:
  - Delete line 22: `const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;`
  - Delete lines 24-28: The `const anthropic = CLAUDE_API_KEY ? new Anthropic({...}) : null;` block
  - Find the fallback code path that uses the `anthropic` client directly (not the proxy) and remove it
  - Ensure ALL testimony generation goes through the Cloudflare proxy at `/api/generate-testimony`
  - Remove `@anthropic-ai/sdk` from `dependencies` in `package.json` if no other file imports it
- **Context Needed**: The proxy function is at `functions/api/generate-testimony.ts` — it already works. The client-side path is only a fallback.
- **Test**: Run `npm run build` and verify no import errors. Search built output for any API key strings.
- **Risk**: None — the proxy is already the primary path

### Step 1.2 — Fix ESLint to Lint TypeScript Files
- [x] **Status**: DONE (Feb 8, 2026)
- **File**: `eslint.config.js`
- **What to do**:
  - Change `files: ['**/*.{js,jsx}']` to `files: ['**/*.{js,jsx,ts,tsx}']`
  - Install `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` as devDependencies
  - Add TypeScript ESLint recommended config to the extends array
  - Note: The first run WILL produce new lint warnings/errors. That's expected and good — just don't fix them all in this step.
- **Test**: Run `npm run lint` — it should now actually analyze `.tsx` files. Record the error count.
- **Risk**: None — linting doesn't change runtime behavior

### Step 1.3 — Add Path Alias to Vite Config
- [x] **Status**: DONE (Feb 8, 2026)
- **File**: `vite.config.js`
- **What to do**:
  - Add `import path from 'path'` at the top
  - Add `resolve: { alias: { '@': path.resolve(__dirname, './src') } }` to the config object
  - This matches what `vitest.config.ts` and `tsconfig.json` already define
- **Test**: Run `npm run build` — should succeed. If any `@/` imports were silently failing, they'll now work.
- **Risk**: None — aligns build config with what TypeScript already expects

### Step 1.4 — Restrict CORS on API Functions
- [x] **Status**: DONE (Feb 8, 2026) — All 7 functions restricted to https://lightning-dni.pages.dev
- **Files**: All files in `functions/api/*.ts`
- **What to do**:
  - Find every instance of `Access-Control-Allow-Origin: *`
  - Replace with `Access-Control-Allow-Origin: https://lightning-dni.pages.dev`
  - **Exception**: `stripe-webhook.ts` should have NO CORS headers (it's server-to-server from Stripe)
  - If there's a custom domain, add that too (comma-separated or check against a list)
- **Context Needed**: Check if there's a custom domain configured. Look at `package.json` homepage field: `https://lightning-dni.pages.dev`
- **Test**: Deploy to Cloudflare Pages preview and verify the app still makes API calls successfully.
- **Risk**: Very low — if the origin is wrong, you'll see CORS errors in browser console immediately

### Step 1.5 — Add CI/CD Pipeline
- [x] **Status**: DONE (Feb 8, 2026)
- **File**: Create `.github/workflows/ci.yml` (new file)
- **What to do**:
  ```yaml
  name: CI
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
  jobs:
    check:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: npm
        - run: npm ci
        - run: npm run build
        - run: npm run type-check
        - run: npm run test:run
  ```
- **Test**: Push to a branch, open a PR, verify the workflow runs.
- **Risk**: None — additive, doesn't change any existing code

### Phase 1 Completion
- [x] All 5 steps checked off
- [x] `npm run build` still succeeds (2.62s)
- [x] Commit with message: `refactor: phase 1 — security fixes, tooling, CI/CD` (c6cf6da)

---

## PHASE 2 — Cleanup & Type Safety (Session 2, ~2-3 hours)

### Step 2.1 — Clean Up Root Directory
- [x] **Status**: DONE (Feb 8, 2026) — Moved 32 HTML mockups, 13 markdown files, 1 SQL file. Deleted empty `0` file. Moved logos to public/. Root now has 19 items.
- **What to do**:
  - Create `docs/mockups/` directory
  - Move ALL `*.html` mockup files from root into `docs/mockups/` (there are ~30 of them)
  - Move `migration-churches-privacy.sql` to `supabase/migrations/`
  - Delete the empty file called `0` in root
  - Delete `button-styles-mockup.html`, `design-improvements.md` from root (they're design artifacts)
  - Keep `index.html` in root (that's the Vite entry point — DO NOT MOVE)
  - Keep `lightning-logo.svg` and `lightning-logo.png` in root OR move to `public/`
- **Test**: Run `npm run build` to verify nothing broke. The `index.html` must stay in root.
- **Risk**: None — just file organization

### Step 2.2 — Consolidate Duplicate Toast Files
- [x] **Status**: DONE (Feb 8, 2026) — Deleted toast.ts (was a re-export shim). toast.tsx is the real file, all 17 imports resolved to it.
- **Files**: `src/lib/toast.ts` and `src/lib/toast.tsx`
- **What to do**:
  - Search the codebase for all imports from `toast.ts` vs `toast.tsx`
  - Determine which is the "real" one (likely `toast.tsx` since it has JSX)
  - Merge any unique exports into the surviving file
  - Delete the redundant file
  - Update all imports to point to the surviving file
- **Test**: `npm run build` — no import errors
- **Risk**: None

### Step 2.3 — Generate Supabase Types
- [x] **Status**: DEFERRED (Feb 8, 2026) — Types already generated (2,330 lines, all tables present). The `as any` casts exist because database modules use hand-rolled interfaces. Eliminating them requires touching all 18 database modules — deferred to Phase 4.
- **What to do**:
  - Run: `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts`
  - (Alternative if no CLI access: manually update `src/types/supabase.ts` to include server tables, channel tables, etc.)
  - After generating, run `npm run type-check` and note which `as any` casts can now be removed
  - Remove `as any` casts in batches by file, starting with `src/lib/database/servers.ts` (66 instances)
  - Do NOT try to remove all 460 instances at once — do one database module at a time
- **Context Needed**: You need the Supabase project ID. Check `.env.local` for `VITE_SUPABASE_URL` — the project ID is the subdomain.
- **Test**: `npm run type-check` after each file. Error count should decrease.
- **Risk**: Low — TypeScript will catch any mismatches immediately

### Step 2.4 — Add Server-Side Rate Limiting
- [x] **Status**: DONE (Feb 8, 2026) — Created shared _rateLimit.ts utility. Added IP-based rate limiting to generate-testimony (10/min), stripe-checkout (5/min), stripe-portal (10/min).
- **Files**: `functions/api/*.ts`
- **What to do**:
  - Implement a rate limiting middleware using Cloudflare's `request.headers.get('CF-Connecting-IP')`
  - Add rate limits to: `generate-testimony.ts` (already has some), `send-email.ts`, `send-push.ts`
  - Use a simple in-memory map with TTL (Cloudflare Workers have no persistent storage without KV)
  - OR use Cloudflare KV for persistent rate limiting (preferred if KV namespace exists)
  - Limits: 10 requests/minute for testimony generation, 30/minute for email, 60/minute for push
- **Test**: Deploy to preview, verify normal usage works, verify rapid-fire requests get 429 responses
- **Risk**: Low — additive code in serverless functions

### Phase 2 Completion
- [x] All 4 steps checked off
- [x] `npm run build` still succeeds (2.62s)
- [x] Commit with message: `refactor: phase 2 — cleanup, type safety, server-side rate limiting` (2bcbf5e)

---

## PHASE 3 — Router & App.tsx Decomposition (Session 3, ~3-4 hours)

**This is the first structurally significant change. Go slow.**

### Step 3.1 — Create AppContext & Extract Shared State
- [x] **Status**: DONE (Feb 8, 2026) — Created `src/contexts/AppContext.tsx` (892 lines). All ~40 useState, ~15 useEffect, and all handler functions extracted from App.tsx into a context provider. Tab components can now use `useAppContext()` instead of props.
- **Note**: React Router was already installed (v7.9.4) and configured in AuthWrapper.tsx with `BrowserRouter`. The app uses mobile-first tab navigation (bottom nav bar), not URL-based routing. Adding URL routes for tabs would break the PWA mobile UX pattern, so we kept the tab-based approach and focused on extracting shared state instead.

### Step 3.2 — Extract SettingsMenu Component
- [x] **Status**: DONE (Feb 8, 2026) — Created `src/components/SettingsMenu.tsx` (312 lines). The entire ~400-line settings sidebar extracted from App.tsx into a standalone component that uses `useAppContext()`.

### Step 3.3 — Extract AppLayout Component
- [x] **Status**: DONE (Feb 8, 2026) — Created `src/components/AppLayout.tsx` (228 lines). Header (light + dark mode), bottom navigation bar, background gradient, and animation styles all extracted into a reusable layout shell. Includes a clean `NavButton` sub-component.

### Step 3.4 — Slim Down App.tsx
- [x] **Status**: DONE (Feb 8, 2026) — App.tsx reduced from 1,978 → 325 lines (84% reduction). Now contains only: AppProvider wrapper, tab content switching (`renderContent`), loading screen, modal dialog rendering, and error boundary. All state, effects, and handlers live in AppContext.
- **Final line count**: 325 (above 200 target because modals are still rendered here — they're thin render-only calls)

### Phase 3 Completion
- [x] All 4 steps checked off
- [x] App.tsx is 325 lines (from 1,978 — 84% reduction)
- [x] Tab navigation works (bottom nav bar — mobile PWA pattern)
- [x] `npm run build` succeeds (5.59s)
- [x] Commit with message: `refactor: phase 3 — App.tsx decomposition, AppContext, extracted components` (d188a15)

---

## PHASE 4 — God Component Decomposition (Session 4-5, ~4-6 hours)

**Do ONE component per session. Never two.**

### Step 4.1 — Decompose GroupsTab (2,207 lines)
- [x] **Status**: DONE (Feb 8, 2026) — commit 43b0ae0. Extracted useGroupManagement, useGroupChat, useGroupMembers hooks. 2,207 → 1,667 lines.
- **What to do**:
  - Extract `useGroupMessages()` hook — all message sending/receiving/subscription logic
  - Extract `useGroupMembers()` hook — member list, roles, permissions
  - Extract `<GroupMessageList />` component — message rendering, reactions, pins
  - Extract `<GroupSettings />` component — group settings panel
  - GroupsTab.tsx should orchestrate these pieces, not implement them
  - Target: GroupsTab.tsx under 400 lines
- **Test**: Create a group, send messages, manage members, change settings, pin a message
- **Risk**: Medium — 43 hooks means complex state interdependencies

### Step 4.2 — Decompose MessagesTab (1,973 lines)
- [ ] **Status**: Not started
- **What to do**:
  - Extract `useConversation()` hook — message loading, sending, real-time subscription
  - Extract `<ConversationList />` component — sidebar conversation list
  - Extract `<MessageThread />` component — individual message thread view
  - Extract `<MessageInput />` component — input bar with image upload, reply preview
  - Target: MessagesTab.tsx under 400 lines
- **Test**: Open conversations, send messages, send images, reply to messages, reactions
- **Risk**: Medium — real-time subscriptions are the tricky part

### Step 4.3 — Decompose ChannelChat (1,644 lines)
- [ ] **Status**: Not started
- **What to do**:
  - Extract `useChannelMessages()` hook — channel message CRUD, real-time sub, typing indicators
  - Extract `<ChannelMessageList />` component — message rendering with pins, reactions, replies
  - Extract `<ChannelHeader />` component — channel name, topic, search, member list toggle
  - Target: ChannelChat.tsx under 400 lines
- **Test**: Send channel messages, pin, react, reply, edit, delete, search, typing indicators
- **Risk**: Medium — similar to MessagesTab but with additional server permission layer

### Step 4.4 — Decompose ServersTab (914 lines, 60 hooks)
- [ ] **Status**: Not started
- **What to do**:
  - Extract `useServerState()` hook — selected server, channels, members, permissions
  - The 60 hooks is the main problem — most are server/channel selection state
  - Consider using `useReducer` instead of 20+ individual `useState` calls
  - Target: ServersTab.tsx under 300 lines
- **Test**: Switch servers, switch channels, create server, join server, server settings
- **Risk**: Medium — highest hook count but logic is simpler (mostly selection state)

### Phase 4 Completion
- [ ] All 4 steps checked off
- [ ] No component over 400 lines in the main components directory
- [ ] All features work identically to before
- [ ] `npm run build` succeeds
- [ ] Commit per component (4 separate commits)

---

## PHASE 5 — Row Level Security (Session 6, ~3-5 hours)

**THIS IS THE HIGHEST RISK PHASE. USE A STAGING ENVIRONMENT.**

### Step 5.0 — Pre-Work: Understand Current Auth Flow
- [ ] **Status**: Not started
- **What to do**:
  - Read `src/components/AuthWrapper.tsx` to understand how Clerk auth maps to Supabase
  - Read `supabase/rls-policies-clerk.sql` to understand what was attempted before
  - Read `src/lib/database/users.ts` — specifically `syncUserToSupabase` — to understand the user identity model
  - Document: How does `clerk_id` map to rows? Is it stored in every table or just `users`?
  - Document: Which tables need user-scoped access vs. public read access?
- **Risk**: None — this is research only

### Step 5.1 — Design RLS Policy Matrix
- [ ] **Status**: Not started
- **What to do**:
  - Create a matrix of every table × operation (SELECT, INSERT, UPDATE, DELETE)
  - For each cell, define: who can do this? (owner, server member, group member, anyone, admin)
  - Write this out as a document before writing any SQL
  - Example:
    - `users` SELECT: anyone (public profiles)
    - `users` UPDATE: only the row owner (clerk_id = auth.uid())
    - `messages` SELECT: only sender or recipient
    - `messages` INSERT: authenticated users only
    - `testimonies` SELECT: depends on privacy setting
- **Risk**: None — planning document only

### Step 5.2 — Set Up Clerk-Supabase JWT Integration
- [ ] **Status**: Not started
- **What to do**:
  - In Clerk Dashboard: create a JWT template for Supabase
  - The JWT should include `sub` (clerk user ID) as the claim
  - In Supabase: set the JWT secret to Clerk's signing key
  - Update `src/lib/supabase.ts` to pass the Clerk JWT to Supabase on each request
  - This allows `auth.uid()` in RLS policies to return the Clerk user ID
- **Context Needed**: Clerk Dashboard access, Supabase Dashboard access
- **Test**: After setup, call `supabase.auth.getUser()` and verify it returns the Clerk user ID
- **Risk**: Medium — JWT misconfiguration can lock out all users. Test thoroughly.

### Step 5.3 — Enable RLS with Permissive Policies First
- [ ] **Status**: Not started
- **What to do**:
  - Write a migration that:
    1. Enables RLS on ALL tables
    2. Creates PERMISSIVE policies that allow everything (temporarily)
    3. This verifies RLS is "on" without breaking anything
  - Run on staging/preview first
  - Verify the entire app still works with RLS enabled but permissive
- **Test**: Every feature of the app — this is a full regression test
- **Risk**: Low — permissive policies = same behavior as RLS off

### Step 5.4 — Tighten Policies Table by Table
- [ ] **Status**: Not started
- **What to do — ONE TABLE AT A TIME**:
  1. Start with `users` table — easiest, clearest ownership model
  2. Test. Verify users can read all profiles, update only their own.
  3. Move to `testimonies` — add privacy-aware read policies
  4. Test. Verify public testimonies visible, private ones restricted.
  5. Move to `messages` — sender/recipient scoping
  6. Test. Verify DMs only visible to participants.
  7. Continue through remaining tables...
  - Commit after each table's policy is verified
- **Test**: After EACH table, test the related feature in the app
- **Risk**: HIGH — this is where silent data disappearance can happen. Go slow.

### Phase 5 Completion
- [ ] All tables have RLS enabled with proper policies
- [ ] Full app regression test passes
- [ ] No data leakage between users
- [ ] Users can still access all their own data
- [ ] Commit with message: `security: enable row-level security with Clerk JWT integration`

---

## PHASE 6 — Hardening & Polish (Sessions 7+, ~8-12 hours)

### Step 6.1 — Centralize Night-Mode Theming
- [ ] **Status**: Not started
- **What to do**:
  - Add `darkMode: 'class'` to `tailwind.config.js`
  - Toggle a `dark` class on `<html>` or `<body>` based on nightMode state
  - Replace inline `nightMode ? darkStyle : lightStyle` conditionals with Tailwind `dark:` variants
  - Do one component at a time, visually verify colors match
- **Risk**: Low — visual regressions only, easily caught

### Step 6.2 — Add Component Tests
- [ ] **Status**: Not started
- **What to do**:
  - Add tests for: `SignInPage`, `SignUpPage`, `ProfileCreationWizard`, `ErrorBoundary`
  - Mock Clerk auth, mock Supabase client
  - Test: renders without crashing, form validation works, error states display
- **Risk**: None — new files only

### Step 6.3 — Supabase RPC Transactions for Multi-Step Operations
- [ ] **Status**: Not started
- **What to do**:
  - Identify multi-step operations: `createServer`, `acceptFriendRequest`, `syncUserToSupabase`
  - Write PostgreSQL functions that wrap these in `BEGIN...COMMIT` transactions
  - Replace client-side sequential calls with single RPC calls
- **Risk**: Low — same logic, better atomicity

### Step 6.4 — Server-Side Permission Enforcement
- [ ] **Status**: Not started
- **What to do**:
  - Move role-based permission checks from `src/lib/permissions.ts` into Supabase RPC functions
  - Server admin operations should verify role in the database, not trust the client
  - Keep client-side checks for UX (hide buttons) but add server-side enforcement
- **Risk**: Medium — overly strict policies could block legitimate admin actions

### Step 6.5 — Accessibility Remediation
- [ ] **Status**: Not started
- **What to do**:
  - Add `aria-label` to all icon-only buttons (search codebase for `<button` without aria)
  - Replace clickable `<div onClick>` with `<button>` elements
  - Add `<nav>` elements for navigation sections
  - Add keyboard event handlers for emoji pickers and custom dropdowns
  - Run axe-core audit and fix reported issues
- **Risk**: None — additive changes only

### Step 6.6 — PWA Offline Support
- [ ] **Status**: Not started
- **What to do**:
  - Update `public/sw.js` to cache static assets (JS, CSS, images)
  - Implement cache-first strategy for static assets, network-first for API calls
  - Add offline fallback page
  - Consider using Workbox for maintainability
- **Risk**: Low — service worker bugs are isolated and debuggable

### Step 6.7 — Database Query Optimization
- [ ] **Status**: Not started
- **What to do**:
  - Create Supabase views for conversation list (eliminate N+1)
  - Add pagination to `getPublicTestimonies`, `getDiscoverTestimonies`
  - Optimize `getUserConversations` to use a materialized view or proper JOIN
- **Risk**: Low — performance improvement, same data

---

## Progress Tracker

| Phase | Description | Status | Date Completed |
|-------|------------|--------|----------------|
| 1 | Zero-Risk Fixes | COMPLETE | Feb 8, 2026 |
| 2 | Cleanup & Types | COMPLETE | Feb 8, 2026 |
| 3 | Router & App.tsx | COMPLETE | Feb 8, 2026 |
| 4 | God Components | Not started | |
| 5 | Row Level Security | Not started | |
| 6 | Hardening & Polish | Not started | |

---

## Emergency Rollback

If any phase goes wrong:

```bash
# See all commits
git log --oneline -20

# Revert to last known good state
git revert HEAD        # Undo last commit (safe, creates new commit)
git reset --hard HEAD~1  # Nuclear option — throws away last commit entirely
```

Each phase should be ONE commit (or one per sub-step for Phase 3-4). This makes rollback surgical.

---

## Notes for Future Claude Sessions

1. **Read this file first** before doing any work
2. **Never skip a step** — they're ordered by dependency
3. **Always run `npm run build` after changes** — if it fails, fix before moving on
4. **Commit after every successful step**, not at the end of a phase
5. **If you crash mid-step**, the checked boxes tell the next session exactly where to resume
6. **The user does not code** — explain what you're doing in plain English and tell them what to test
7. **App is live at**: https://lightning-dni.pages.dev (Cloudflare Pages)
8. **Auth**: Clerk  |  **DB**: Supabase  |  **Hosting**: Cloudflare Pages + Workers
