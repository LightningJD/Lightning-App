# Claude Session Instructions

## Before doing ANY work, read:
1. `docs/REFACTORING_PLAN.md` — the master plan with checkboxes tracking progress
2. Find the first unchecked `[ ]` step — that's where you resume

## Project Context
- **App**: Lightning — faith-based social platform (testimonies, messaging, servers, groups)
- **Stack**: React 19 + TypeScript + Vite 7 + Supabase + Clerk Auth + Tailwind + Cloudflare Pages
- **Live URL**: https://lightning-dni.pages.dev
- **The user does not code** — explain changes in plain English, tell them what to test

## Key Rules
- Commit after every successful step (not at end of session)
- Run `npm run build` after every change
- Never refactor two god components in the same session
- Always test one change before starting the next
- If a step fails, add a note in the plan doc explaining what happened

## Critical Files
- `src/App.tsx` — 1,978-line god component (being decomposed in Phase 3)
- `src/lib/database/index.ts` — barrel export for all 18 database modules
- `src/lib/supabase.ts` — Supabase client initialization
- `functions/api/*` — Cloudflare Pages serverless functions
- `supabase/migrations/*` — database migrations
