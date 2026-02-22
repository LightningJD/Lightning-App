# CLAUDE.md — Code Guardian Rules for Lightning

**GOVERNING PRINCIPLE**: If you are not highly confident a change is safe, say so. Never guess silently. Uncertainty is useful — hiding it is not.

---

## Project Overview

Lightning is a faith-based social networking app that helps Christians create and share AI-powered testimonies. Built as a React/TypeScript frontend with Supabase backend and Clerk authentication. The app uses Claude Sonnet 4 for AI testimony generation through a three-question flow.

### Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 7
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude Sonnet 4 via Anthropic API
- **Styling**: Tailwind CSS
- **Hosting**: Cloudflare Pages + Workers
- **Live URL**: https://lightning-dni.pages.dev
- **Mobile**: Capacitor (planned)

### Key Directories

Explore the repo to understand the structure before making changes. Do not assume file locations — verify them.

---

## Session Start

Before doing ANY work, read:
1. `docs/REFACTORING_PLAN.md` — the master plan with checkboxes tracking progress
2. Find the first unchecked `[ ]` step — that's where you resume

### Session Rules

- **The user does not code** — explain changes in plain English, tell them what to test
- Commit after every successful step (not at end of session)
- Run `npm run build` after every change
- Never refactor two god components in the same session
- Always test one change before starting the next
- If a step fails, add a note in the plan doc explaining what happened
- **Before fixing ANY bug**, check if the relevant logic lives in a hook (`src/hooks/`) — fix it there, not in the component. The hooks are the source of truth for state and business logic.

---

## Auto-Detect Mode

Detect the mode automatically from every request. Do not ask the user to pick:

- Describes something broken, not working, erroring, crashing → **Bug Fix mode**
- Asks to add, create, or build something new → **New Feature mode**
- Asks to move, remove, resize, rearrange, or restyle UI → **Design Change mode**

State which mode you selected in one line, then proceed immediately. Do not ask for confirmation.

---

## Core Rules (Always Apply)

1. **No duplication.** Before writing ANY new code, search the codebase for similar functionality. Check existing utilities, components, hooks, and helpers. Reuse or extend what exists. Never rebuild something that already exists elsewhere.

2. **Respect existing architecture.** Do not restructure files, rename conventions, change design patterns, or reorganize project structure unless explicitly asked.

3. **No state management changes without permission.** Do not add, remove, move, or restructure useState, useEffect, useContext, or any state/context providers unless the task specifically requires it and you explain why.

4. **No unnecessary abstractions.** Do not create wrapper components, helper functions, custom hooks, or utility files unless they will be used in 3+ places. Simpler is better.

5. **No dependency changes.** Don't add, remove, or update imports/packages unless directly required. If you must, flag it.

6. **Explain before coding.** Before writing any code, briefly state:
   - What you're doing and why
   - What you're intentionally NOT touching
   - Any risks or cross-file impacts
   - Confidence level (HIGH / MEDIUM / LOW) with one sentence explaining why
   - Security considerations if the change touches auth, data, APIs, or user input

7. **Match existing patterns.** Follow the naming conventions, file structure, component patterns, and coding style already in the codebase. Do not introduce new patterns.

8. **Clean up after yourself.** If your changes make any existing code unused (imports, variables, functions, components, styles), remove the dead code. Never leave orphans.

9. **Duplication alarm.** If you are about to create a new function, component, hook, or utility, first search the codebase. If you find something similar, use it. If you don't find a match, say: "I'm creating [thing]. I searched the codebase and didn't find anything similar. Let me know if this already exists." Never silently create net-new code.

10. **Silent self-review.** After writing your code but before presenting your response, silently review your own work:
    - Does this change accidentally affect any other feature?
    - Did I introduce any new state, effects, or side effects that weren't there before?
    - Is there a simpler way to do this with fewer changes?
    - If I'm wrong about the root cause, would applying this change cause damage?
    If the answer to the last question is yes, lower your confidence to MEDIUM or LOW and explain what could go wrong. Do NOT mention that you performed a self-review.

---

## Security Rules (Always Apply)

These rules are non-negotiable on every single response.

1. **Never expose secrets client-side.** API keys, Supabase URLs, Clerk secrets, tokens, and credentials must NEVER appear in any file that runs in the browser. These belong in server-side code only and must be accessed through environment variables. If you see secrets in client-side code, flag it immediately.

2. **Every API route must check authentication.** Any API route or server action that reads or writes data must verify the user is logged in via Clerk before doing anything else. Never create an unprotected endpoint.

3. **Every API route must check authorization.** Authentication is not enough. User A must never be able to access, modify, or delete User B's data. Always include ownership checks on Supabase queries (filter by user ID).

4. **Validate and sanitize all user input.** Every form field, URL parameter, and request body must be validated before use. Check types, lengths, formats. Strip or escape HTML to prevent XSS.

5. **Never use dangerouslySetInnerHTML** unless absolutely necessary AND the content has been sanitized with a library like DOMPurify. If you must use it, flag it as a risk.

6. **No secrets in code.** Never hardcode passwords, API keys, Supabase keys, Clerk keys, or any sensitive values in source code. Always use environment variables. If you see hardcoded secrets in existing code, flag it immediately.

7. **Supabase queries must be parameterized.** Use Supabase client methods (`.eq()`, `.match()`, etc.) — never build queries by concatenating user input into strings.

8. **Error messages must not leak internals.** Never return raw database errors, stack traces, or file paths to the user. Catch errors and return generic safe messages. Log details server-side only.

9. **Rate limiting awareness.** If creating API routes that could be abused (testimony submission, AI generation calls, auth endpoints), flag that rate limiting should be considered.

10. **Secure data handling for testimonies and user data.**
    - Don't store tokens or sensitive data in localStorage or sessionStorage
    - Don't log sensitive data to the console in production
    - Don't include sensitive data in URLs or query parameters
    - Don't expose other users' testimony data or personal info in API responses
    - Clerk tokens must be validated server-side, never trusted from the client alone

11. **Silent security review.** As part of your self-review, also check:
    - Is any secret or credential exposed client-side?
    - Can an unauthenticated user reach this code path?
    - Can User A use this to access User B's testimonies or data?
    - Is user input being trusted without validation?
    - Could this code be exploited if someone sent unexpected data?
    If ANY answer is yes, flag it in your response and lower confidence.

---

## Bug Fix Mode

Applied automatically when the request describes something broken or not working.

1. **Surgical fixes only.** Fix the specific bug — nothing else. Do not refactor, reorganize, rename, or "improve" surrounding code.

2. **Do not modify any function signatures, type definitions, component props, or API contracts** unless the bug literally cannot be fixed without it. If you must, flag it and explain downstream impact.

3. **Preserve all existing behavior.** Every current feature, side effect, and edge case must continue working. If you're unsure whether something is intentional, assume it is.

4. **Minimal diff.** Change the fewest lines possible. If your fix touches more than ~15 lines, stop and ask if there's a simpler approach.

5. **No silent type changes.** Do not change types, add/remove optional chaining, modify type unions, or alter null/undefined handling beyond what the bug requires.

6. **No async restructuring.** Do not rearrange promise chains, add/remove awaits, or change async timing unless the bug is specifically a race condition you can explain.

7. **Check cross-file impact.** If the code you're changing is imported or called elsewhere, verify those call sites still work.

8. **Flag nearby issues.** If you see other bugs nearby, mention them but DO NOT fix them. That's a separate task.

---

## New Feature Mode

Applied automatically when the request asks to add, create, or build something new.

1. **Reuse first, build second.** Before creating any new component, hook, utility, or function — search the codebase for something similar. Justify any net-new code.

2. **One component, one job.** Don't create a new component for every slight variation. Make flexible, reusable components with props.

3. **Keep the footprint small.** Add the minimum lines of code needed. If your implementation seems long, it probably is. Ask if there's a leaner approach.

4. **No speculative code.** Don't add features, error handling, or flexibility "just in case" or "for future use." Build exactly what's needed now.

5. **Follow existing data flow.** Use the state management and data fetching patterns already in Lightning. Don't introduce new context providers, state libraries, or fetching methods without explicit approval.

6. **Integrate, don't isolate.** New code must plug into existing structure — use existing layouts, shared components, established routes, and current styling patterns.

7. **Track your additions.** At the end, summarize:
   - New files created and why
   - New dependencies added (if any)
   - Existing files modified and what changed

---

## Design Change Mode

Applied automatically when the request involves moving, removing, resizing, or rearranging UI.

1. **Move means move, not rebuild.** When relocating a component, cut it from the old location and place it in the new one. Do not rebuild from scratch.

2. **Remove means remove everything.** When deleting a UI element, also remove:
   - Its imports
   - Its state (useState, variables, refs)
   - Its event handlers and callbacks
   - Its styles/classNames (if not shared)
   - Its types/interfaces (if not used elsewhere)
   - Any useEffect or logic that only existed to support it
   Leave zero dead code behind.

3. **Add by extending, not duplicating.** When adding a new UI element, check if a similar component exists that could be reused or adapted with props.

4. **Preserve all non-visual behavior.** Moving or changing UI must not alter:
   - Business logic or data flow
   - Supabase queries or data fetching
   - Clerk authentication or permissions
   - Form validation or submission behavior
   - Navigation and routing logic

5. **CSS/styling changes only where needed.** Don't restyle unrelated components. Don't "clean up" styles you weren't asked to touch.

6. **The codebase should be the same size or smaller after a design change.** If line count went up significantly, something was duplicated instead of moved.

---

## Lightning-Specific Rules

1. **Testimony generation flow is sacred.** The three-question testimony generation flow is the core of the app. Never modify its logic, question order, or AI prompt structure unless explicitly asked. Changes to this flow require HIGH confidence and thorough explanation.

2. **Clerk auth patterns.** Follow the existing Clerk integration patterns. Use `useUser()`, `useAuth()`, and Clerk middleware as they're currently implemented. Don't create alternative auth checking patterns.

3. **Supabase query patterns.** Follow existing Supabase client usage. Don't mix different query styles. Always include RLS-compatible user ID filters on queries that access user-specific data.

4. **Church/community data boundaries.** Churches and communities have data boundaries. Never write queries that could leak one church's data to another. Always filter by the appropriate church/community ID.

5. **AI API calls.** All Anthropic API calls for testimony generation must happen server-side. Never expose the Anthropic API key to the client. Never send user data to the AI without the user's knowledge.

---

## Critical Files

- `src/App.tsx` — 325 lines (decomposed in Phase 3, was 1,978)
- `src/contexts/AppContext.tsx` — shared app state (extracted from App.tsx)
- `src/hooks/` — extracted business logic hooks:
  - `useMessages.ts` — DM messages, reactions, sending, real-time subscriptions
  - `useNewChat.ts` — new chat dialog, friend search, connection selection
  - `useGroupManagement.ts` — group CRUD, discovery, invites
  - `useGroupChat.ts` — group messages, sending, real-time
  - `useGroupMembers.ts` — member list, roles, permissions
  - `useChannelMessages.ts` — channel message CRUD, reactions, typing, search, @mentions
  - `useServerState.ts` — server/channel/role/member/ban/invite state + all handlers
- `src/lib/database/index.ts` — barrel export for all 18 database modules
- `src/lib/supabase.ts` — Supabase client initialization
- `functions/api/*` — Cloudflare Pages serverless functions
- `supabase/migrations/*` — database migrations
