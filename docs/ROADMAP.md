# Lightning App — Master Plan & Roadmap

**App Name:** Lightning
**Type:** Faith-based social networking app
**Focus:** Authentic connections through AI-powered testimonies
**Target Audience:** Christians seeking community and connection
**Live URL:** https://lightning-dni.pages.dev

---

## Current Status (Updated: February 11, 2026)

- **Frontend UI:** 100% complete (glassmorphic design, night mode, responsive)
- **Authentication:** 100% complete (Clerk — Google OAuth)
- **Database:** 100% complete (Supabase — ~59 tables, RLS enabled on all)
- **Messaging:** 100% complete (DMs + group chat + server channels, real-time)
- **Servers:** 100% complete (Discord-style servers with channels, roles, bans, invites)
- **Premium Billing:** 100% complete (Stripe integration — checkout, portal, webhooks)
- **Refactoring:** Phases 1-5 complete (security, cleanup, decomposition, RLS)
- **CI/CD:** GitHub Actions pipeline (build, type-check, test on every push/PR)
- **Deployment:** Cloudflare Pages (unlimited bandwidth, global CDN, auto-deploy on push)

### What's Left Before Public Launch

1. **Switch Clerk to Production Keys** (~15 min) — currently on development keys
2. **Apple Sign In** — requires Apple Developer account ($99/year)
3. **Full QA regression test** — verify all features work end-to-end after RLS rollout
4. **Phase 6 hardening items** — dark mode centralization, accessibility, tests, query optimization

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React 19 + TypeScript + Vite 7 | SPA with glassmorphic UI |
| **Styling** | Tailwind CSS 3.4 | Night mode via inline conditionals |
| **Auth** | Clerk 5.x | Google OAuth, JWT passed to Supabase |
| **Database** | Supabase (PostgreSQL + PostGIS) | ~59 tables, RLS on all, real-time subscriptions |
| **AI** | Claude (via Cloudflare proxy) | Testimony generation at `/api/generate-testimony` |
| **Payments** | Stripe | Checkout, portal, webhooks via Cloudflare Workers |
| **Hosting** | Cloudflare Pages + Workers | Serverless API functions in `functions/api/` |
| **Monitoring** | Sentry | Error tracking with session replay |
| **Icons** | Lucide React | Consistent icon system |
| **Routing** | React Router 7.x | Tab-based navigation (mobile PWA pattern) |
| **CI/CD** | GitHub Actions | Build + type-check + test on push/PR |

---

## App Structure

### Navigation (3 bottom tabs)
1. **Home** — Messages (DMs) + Servers (channels), unread badge count
2. **Find** — Discover nearby believers, leaderboard, referrals
3. **You** — Profile, testimony, music player, settings

### Core Features (All Built)
- **AI Testimony Generator** — 4 questions, Claude generates 250-350 word structured story
- **Direct Messaging** — 1-to-1 real-time chat with reactions, replies, image sharing
- **Groups** — Community groups with co-leaders, pinned messages, announcements, events
- **Servers** — Discord-style servers with channels, roles, permissions, bans, invites
- **Channel Chat** — Real-time messaging in server channels with typing indicators, search, @mentions
- **Nearby Discovery** — Location-based user discovery with filtering and sorting
- **Friend System** — Send/accept/decline requests, mutual friends, blocking
- **Profiles** — Full profile pages (view others like Facebook), edit dialog, profile cards
- **Premium Billing** — Stripe-powered subscription tiers with checkout and portal
- **Leaderboard** — Points/ranking system with cycle countdowns
- **Referral System** — Invite codes, referral tracking, ambassador program
- **Events** — Event creation, RSVP, calendar view within groups
- **Announcements** — Group announcements with read receipts and acknowledgments
- **Secrets Museum** — Hidden achievements with rarity levels (common/rare/epic/legendary)
- **Scripture Cards** — Daily scripture display
- **Music Player** — Spotify integration on profile
- **Night Mode** — Full dark theme across all components
- **Settings** — Privacy controls, notification preferences, blocked users, reporting, legal pages
- **Bug Reporting** — In-app bug report dialog
- **Error Boundaries** — Graceful failure handling, no white screens
- **Skeleton Loaders** — Loading states across the app

---

## Architecture (After Feb 2026 Refactoring)

### Key Files
| File | Lines | Purpose |
|------|-------|---------|
| `src/App.tsx` | 325 | Orchestrator — tab switching, modals, error boundary |
| `src/contexts/AppContext.tsx` | 876 | Shared app state (extracted from App.tsx) |
| `src/components/AppLayout.tsx` | 228 | Header, bottom nav, background gradient |
| `src/components/SettingsMenu.tsx` | 312 | Settings sidebar |

### Extracted Hooks (`src/hooks/`)
| Hook | Purpose |
|------|---------|
| `useMessages.ts` | DM messages, reactions, sending, real-time subscriptions |
| `useNewChat.ts` | New chat dialog, friend search, connection selection |
| `useGroupManagement.ts` | Group CRUD, discovery, invites |
| `useGroupChat.ts` | Group messages, sending, real-time |
| `useGroupMembers.ts` | Member list, roles, permissions |
| `useChannelMessages.ts` | Channel message CRUD, reactions, typing, search, @mentions |
| `useServerState.ts` | Server/channel/role/member/ban/invite state + handlers |
| `useGeolocation.ts` | Location services |
| `useGuestModal.ts` | Guest/freemium modal flow |

### Database Layer
- 18 modules in `src/lib/database/` with barrel export via `index.ts`
- Supabase types in `src/types/supabase.ts` (2,330 lines, auto-generated)
- 38 migration files in `supabase/migrations/`

### Serverless API (`functions/api/`)
| Function | Purpose |
|----------|---------|
| `generate-testimony.ts` | Claude AI testimony generation (rate limited: 10/min) |
| `stripe-checkout.ts` | Create Stripe checkout session (rate limited: 5/min) |
| `stripe-portal.ts` | Create Stripe billing portal (rate limited: 10/min) |
| `stripe-webhook.ts` | Handle Stripe webhook events (no CORS — server-to-server) |
| `subscription-status.ts` | Check user subscription status |
| `send-email.ts` | Send transactional emails |
| `send-push.ts` | Send push notifications |
| `_rateLimit.ts` | Shared rate limiting utility (IP-based, in-memory) |

---

## Completed Work

### Phase 1: MVP (Oct-Nov 2025)
Authentication, database, profiles, messaging, groups, nearby discovery, testimonies, settings, legal pages, UI polish, Cloudflare migration. All core functionality built and deployed.

### Phase 1.5: Code Architecture (Oct 2025)
Database layer refactored from monolithic 1,177-line file into 18 SOLID modules. TypeScript migration completed (335 errors to 0). Error boundaries added.

### Phase 1.75: Production Hardening (Oct 2025)
Sentry monitoring, database backup scripts, client-side rate limiting, input validation library, content reporting system.

### Feature Additions (Nov 2025 - Feb 2026)
- Discord-style servers with 8 features (channels, roles, permissions, bans, invites, etc.)
- Complete Stripe premium billing system (checkout, portal, webhooks, subscription status)
- Announcements, events, leaderboard, referral system, ambassador program
- Profile redesign (Facebook-style, reusable for viewing other users)
- Bug fixes: blocking enforcement, online status, friend requests, chat UX, message performance

### Refactoring Phases 1-5 (Feb 8-9, 2026)
Tracked in detail in `docs/REFACTORING_PLAN.md`:

| Phase | What | Result |
|-------|------|--------|
| 1 — Zero-Risk Fixes | Removed client-side API key, fixed ESLint, added path alias, restricted CORS, added CI/CD | Security + tooling baseline |
| 2 — Cleanup & Types | Cleaned root dir (moved 32 HTML mockups), consolidated duplicate files, added server-side rate limiting | Clean project structure |
| 3 — App.tsx Decomposition | Extracted AppContext (876 lines), SettingsMenu, AppLayout | App.tsx: 1,978 → 325 lines (84% reduction) |
| 4 — God Components | Extracted 7 hooks from GroupsTab, MessagesTab, ChannelChat, ServersTab | Business logic separated from UI |
| 5 — Row Level Security | Clerk-Supabase JWT integration, RLS enabled on all 46 tables, 6 helper functions, proper policies | Database-level access control |

### SonarQube Integration (Feb 11, 2026)
Code quality scanning added via PRs #21 and #22.

---

## What's Next

### Phase 6 — Hardening & Polish (Current Phase)
Tracked in `docs/REFACTORING_PLAN.md`. These are the remaining engineering tasks:

- [ ] **6.1 — Centralize Night Mode Theming** — Switch from inline `nightMode ?` conditionals to Tailwind `dark:` variants with `darkMode: 'class'`
- [ ] **6.2 — Add Component Tests** — Tests for SignInPage, SignUpPage, ProfileCreationWizard, ErrorBoundary
- [ ] **6.3 — Supabase RPC Transactions** — Wrap multi-step operations (createServer, acceptFriendRequest) in database transactions
- [ ] **6.4 — Server-Side Permission Enforcement** — Move role checks from client into Supabase RPC functions
- [ ] **6.5 — Accessibility Remediation** — aria-labels, semantic HTML, keyboard navigation, axe-core audit
- [ ] **6.6 — PWA Offline Support** — Service worker caching, offline fallback page (consider Workbox)
- [ ] **6.7 — Database Query Optimization** — Conversation list view (eliminate N+1), pagination, materialized views

### Component Size Reduction (Ongoing)
Several components remain large due to JSX. Further extraction needed:

| Component | Lines | Target |
|-----------|-------|--------|
| GroupsTab.tsx | 1,667 | < 400 |
| MessagesTab.tsx | 1,298 | < 400 |
| NearbyTab.tsx | 1,188 | < 400 |
| ProfileTab.tsx | 1,095 | < 400 |
| AnnouncementsView.tsx | 1,003 | < 400 |
| ProfileEditDialog.tsx | 843 | < 500 |
| EventsView.tsx | 735 | < 400 |

---

## Future Phases

### Growth Features (Post-Launch)
- [ ] **Testimony-First Conversion** — Let guests create testimony before signup, then prompt to save (expected 65-80% conversion)
- [ ] **Freemium Browse & Block** — 2 testimonies, 3 users, then require signup (infrastructure exists in `useGuestModal`)
- [ ] **Push Notifications** — Firebase Cloud Messaging for re-engagement
- [ ] **Email Re-engagement** — Drip campaigns for inactive users
- [ ] **Referral Incentives** — Invite friends, unlock premium features
- [ ] **Social Sharing** — Share testimonies externally with auto-generated cards
- [ ] **Search & Discovery** — Global search across users, groups, testimonies with autocomplete
- [ ] **In-App Notification Center** — Centralized notifications with badge counts

### Advanced Features
- [ ] Voice messages
- [ ] Video calls
- [ ] AI content moderation
- [ ] Church dashboard / partnership program
- [ ] Mobile app (React Native)

### Global Expansion — Multilingual Support
**Status:** Post product-market fit in US
**Target:** International Christian communities, starting with Brazil

**Why Brazil First:**
- 123 million Christians (58% of population)
- Fastest-growing evangelical population in Latin America
- High smartphone adoption (85%+) and social media engagement

**Implementation Phases:**
1. **Text Translation** (2-3 weeks) — i18n with react-i18next, Google Translate API for user content
2. **Audio Translation** (3-4 weeks) — TTS for testimonies, STT for voice input
3. **AI Testimony in Portuguese** (2-3 weeks) — Localized prompts and writing framework
4. **Brazil Launch** (4-6 weeks) — Church partnerships, beta testers, localized marketing

**Future Languages (by Christian population):** Spanish, French, Swahili, Korean, Tagalog, Mandarin

**Estimated Cost:** $5,000-10,000 one-time + $2,000-5,000/month per language

---

## Launch Criteria

### Beta Launch (50 users)
- [x] All core features working (auth, profiles, messaging, groups, servers, testimonies)
- [x] Data persists in database
- [x] Real-time messaging works
- [x] Legal pages published (Terms, Privacy)
- [x] Mobile responsive
- [x] Error handling and monitoring (Sentry)
- [ ] Apple Sign In enabled
- [ ] Clerk production keys activated
- [ ] Testimony-first conversion flow

### Public Launch
- [ ] Clerk production keys (currently on development keys)
- [ ] Full QA regression test post-RLS
- [ ] Push notifications working
- [ ] Performance audit (Lighthouse)
- [ ] 7-day retention > 40%

---

## Decisions Log

| Decision | Choice | Notes |
|----------|--------|-------|
| Authentication | Clerk (Google OAuth) | Free up to 10K users. Apple Sign In planned. |
| Database | Supabase (PostgreSQL + PostGIS) | ~59 tables, RLS enabled, real-time |
| Image Storage | Cloudinary | Free tier 25GB |
| AI Model | Claude (via Cloudflare proxy) | Previously GPT-4o-mini, migrated to Claude |
| Messaging | Supabase Realtime | Was considering Firebase, chose Supabase |
| Payments | Stripe | Checkout + portal + webhooks |
| Hosting | Cloudflare Pages + Workers | Migrated from Netlify (Oct 2025) — unlimited bandwidth |
| Navigation | 3 tabs (Home, Find, You) | Mobile PWA pattern with bottom nav |
| Theme | Blue gradient (#4facfe to #00f2fe) | Glassmorphic design with night mode |
| Testimony | 4 questions, 250-350 words, 4 paragraphs | AI-generated, user's words preserved |

### Open Questions
- Mobile app timeline (React Native)?
- Video call feature priority?
- Premium tier pricing structure?
- Church partnership program details?

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Database overload | Connection pooling, query optimization, pagination (Phase 6.7) |
| API cost spike | Rate limiting on all API functions, Cloudflare Workers |
| Real-time lag | Optimized subscriptions, unique channel names, fresh JWT per request |
| Privacy/security | RLS on all tables, CORS restricted, server-side rate limiting |
| Low engagement | Testimony-first conversion, push notifications, referral program |
| Toxic content | Report system, blocked users, admin dashboard |

---

## Reference

- **Refactoring Plan (detailed):** `docs/REFACTORING_PLAN.md`
- **RLS Policy Matrix:** `docs/RLS_POLICY_MATRIX.md`
- **Database Schema:** `supabase/migrations/` and `src/types/supabase.ts`
- **Supabase Docs:** https://supabase.com/docs
- **Clerk Docs:** https://clerk.com/docs
- **Cloudflare Pages Docs:** https://developers.cloudflare.com/pages
