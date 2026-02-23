# Phase 1 & 2 — Remaining Tasks Audit

**Created**: February 23, 2026
**Purpose**: Document gaps found during thorough review of Phase 1 and 2 completion claims

---

## Phase 1 — Zero-Risk Fixes: 3 Gaps Found

### Step 1.1 — Remove Client-Side Claude API Key Fallback
**Status: MOSTLY DONE, 1 leftover artifact**

Main client code (`src/lib/api/claude.ts`) is clean — all testimony generation routes through the `/api/generate-testimony` proxy. `@anthropic-ai/sdk` was removed from `package.json`.

**Gap:** `src/scripts/test-generation.cjs` still exists and:
- Imports `@anthropic-ai/sdk` (line 2)
- Reads `VITE_CLAUDE_API_KEY` from `.env.local` (line 12)
- Uses the Anthropic SDK directly (line 26)

**Fix:** Delete or rewrite this test script to use the proxy endpoint.

---

### Step 1.4 — Restrict CORS on API Functions
**Status: MOSTLY DONE, 1 deviation**

All 7 API functions restricted to `https://lightning-dni.pages.dev`.

**Gap:** `stripe-webhook.ts` has CORS headers but the plan stated it should have NONE (server-to-server from Stripe, not browser requests).

**Fix:** Remove CORS headers from `stripe-webhook.ts`.

---

### Step 1.5 — CI/CD Pipeline
**Status: COMPLETE, missing lint step**

CI runs build, type-check, and tests but no `npm run lint` despite ESLint being configured in Step 1.2.

**Fix:** Add `npm run lint` step to `.github/workflows/ci.yml`.

---

## Phase 2 — Cleanup & Type Safety: 2 Significant Gaps

### Step 2.3 — Generate Supabase Types
**Status: DEFERRED and NEVER COMPLETED**

Types are generated (`src/types/supabase.ts`, 2,329 lines), but **192 `as any` casts remain across 14 database files**.

| File | `as any` count |
|------|---------------|
| `referrals.ts` | 61 |
| `users.ts` | 26 |
| `servers.ts` | 21 |
| `churches.ts` | 17 |
| `testimonies.ts` | 15 |
| `privacy.ts` | 10 |
| `friends.ts` | 8 |
| `followers.ts` | 8 |
| `events.ts` | 7 |
| `messageHelpers.ts` | 6 |
| `groups.ts` | 6 |
| `announcements.ts` | 3 |
| `messages.ts` | 2 |
| `blocking.ts` | 2 |

**Fix:** Remove `as any` casts one database module at a time, using generated Supabase types.

---

### Step 2.4 — Add Server-Side Rate Limiting
**Status: PARTIALLY DONE — 3 endpoints unprotected**

| Endpoint | Rate Limited | Planned Limit |
|----------|-------------|---------------|
| `generate-testimony.ts` | YES | DB-backed: 5/day auth, 3/hr guest |
| `stripe-checkout.ts` | YES | 5 req / 60s per IP |
| `stripe-portal.ts` | YES | 10 req / 60s per IP |
| `send-email.ts` | **NO** | 30/min per IP |
| `send-push.ts` | **NO** | 60/min per IP |
| `subscription-status.ts` | **NO** | Not specified (recommend 30/min) |

The shared `_rateLimit.ts` utility exists — just never imported into the unprotected endpoints.

---

## Security Gaps Found (Related to Phase 1/2 Goals)

### Missing Authentication on 3 API Endpoints

Per CLAUDE.md: "Every API route must check authentication" and "Every API route must check authorization."

These endpoints have **no auth checks**:

1. **`send-email.ts`** — Anyone can send transactional emails via `POST /api/send-email`
2. **`send-push.ts`** — Anyone can trigger push notifications to any `userId`
3. **`subscription-status.ts`** — Anyone can query subscription status for any server/user

### `send-push.ts` — Incomplete Implementation

`sendWebPush()` function (line 185-217) is a placeholder. Comment says "TODO: Implement proper Web Push encryption." Missing ECDH key exchange and VAPID JWT headers.

### Error Message Leaking

`send-email.ts:194` returns Resend API error messages directly to caller (`result.message`). Should return generic error.

### No `.env.example`

No documentation of required environment variables for dev setup.

---

## Priority Matrix

| Priority | Task | Phase | Effort |
|----------|------|-------|--------|
| **HIGH** | Add auth checks to `send-email`, `send-push`, `subscription-status` | 1 | Small |
| **HIGH** | Add rate limiting to `send-email`, `send-push`, `subscription-status` | 2.4 | Small |
| **MEDIUM** | Remove 192 `as any` casts across 14 database modules | 2.3 | Medium |
| **LOW** | Delete/update `src/scripts/test-generation.cjs` | 1.1 | Tiny |
| **LOW** | Remove CORS from `stripe-webhook.ts` | 1.4 | Tiny |
| **LOW** | Add `npm run lint` to CI pipeline | 1.5 | Tiny |
| **LOW** | Fix error message leak in `send-email.ts` | 1 | Tiny |
| **LOW** | Create `.env.example` | 2 | Small |
