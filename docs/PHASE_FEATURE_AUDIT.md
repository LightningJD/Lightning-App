# Lightning App — Phase 1 & Phase 2 Feature Audit

> **Generated:** 2026-03-08
> **Purpose:** Comprehensive, code-verified inventory of every feature in the app, sorted by phase.
> **Phase control:** `src/lib/phase.ts` — currently `PHASE = 1`

---

## Navigation (Phase 1)

3 bottom tabs: **Charge** (center lightning icon) | **Home/Messages** (floating DM button) | **You** (profile)

---

# PHASE 1 — Accessible Now

## 1. Testimony Generator

> **Decision:** Phase 1

### What it does
4-question AI flow that generates a personal faith testimony using Claude Sonnet 4.

### Sub-features
| Sub-feature | Status | Details |
|---|---|---|
| 4-question flow | Working | Before salvation, path to God, turning point, current walk |
| AI generation (Claude Sonnet 4) | Working | Server-side via Cloudflare Pages Function; API key never exposed client-side |
| Visibility selector | Working | My Church / All Churches / Shareable |
| Edit testimony | Working | Re-opens 4 questions pre-filled, can regenerate |
| Delete testimony | Working | Permanent, cascades likes/comments/views |
| Share testimony | Working | Copy link, Twitter/X, Facebook, WhatsApp; URL format `lightningsocial.io/testimony/{id}` |
| Likes (heart toggle) | Working | Unique per user per testimony; real-time count via DB trigger |
| Comments | Working | Add/delete with user profiles; ordered chronologically |
| View tracking | Working | Unique per viewer per testimony; auto-increments count |
| Lesson learned field | Working | Optional takeaway, shown in edit preview |
| Guest pre-signup flow | Working | Saves to localStorage, prompts signup via SaveTestimonyModal |
| 3-layer rate limiting | Working | Client localStorage (3/hr) + Supabase table (5/24hr) + Cloudflare IP (10/min) |
| Profanity filtering | Working | Client-side + server-side word boundary check |
| One testimony per user | Working | Upsert constraint; updates, never duplicates |

### Key files
- `src/components/TestimonyQuestionnaire.tsx` — 4-question UI + generation trigger
- `src/components/EditTestimonyDialog.tsx` — Edit/regenerate flow
- `src/components/TestimonyShareModal.tsx` — Social sharing modal
- `src/components/SaveTestimonyModal.tsx` — Guest conversion modal
- `src/config/testimonyQuestions.ts` — Question definitions + validation rules
- `src/lib/database/testimonies.ts` — CRUD + analytics (views, likes, comments, feed queries)
- `src/lib/database/testimonyRateLimit.ts` — Server-side rate limiting
- `src/lib/api/claude.ts` — Client-side proxy caller + profanity filter
- `functions/api/generate-testimony.ts` — Cloudflare Pages Function (Claude API proxy)
- `src/lib/guestTestimony.ts` — localStorage persistence for guest testimonies
- `src/lib/rateLimiter.ts` — Client-side localStorage rate limiter

---

## 2. Charge Tab (Discovery Feed)

> **Decision:** Phase 1

### What it does
Main discovery feed showing church testimonies, trending content, and people search.

### Sub-features
| Sub-feature | Status | Details |
|---|---|---|
| Testimony feed | Working | Church testimonies (all visibility) + friends' cross-church (all_churches/shareable) + own |
| Trending testimony | Working | Most-liked from user's church in past 7 days; "Trending in your church" badge |
| People search | Working | Case-insensitive substring on display_name/username; debounced 300ms; max 20 results |
| User cards | Working | Avatar, display name, @username, location, online status, mutual friends count |
| Block filtering in search | Working | Bidirectional — blocked users excluded from results |
| Friend action on cards | Working | Add Friend / Pending / Friends buttons per search result |
| Message from card | Working | Opens DM with selected user |
| Church context bar | Working | Shows church name + testimony count when not searching |
| Profile dialog on click | Working | Opens OtherUserProfileDialog for testimony authors |

### Key files
- `src/components/NearbyTab.tsx` (636 lines) — Main Charge Tab component
- `src/components/UserCard.tsx` — User card in search results
- `src/components/OtherUserProfileDialog.tsx` — Full profile modal on author click
- `src/lib/database/testimonies.ts` — `getFeedTestimonies()`, `getTrendingTestimony()`
- `src/lib/database/users.ts` — `searchUsers()`

---

## 3. Direct Messaging (DMs)

> **Decision:** Phase 1

### What it does
Real-time 1-on-1 messaging between users.

### Sub-features
| Sub-feature | Status | Details |
|---|---|---|
| Real-time messaging | Working | Supabase Realtime WebSocket; INSERT-only subscription on recipient_id |
| Optimistic UI updates | Working | Sent messages appear instantly before DB confirms |
| Emoji reactions | Working | 24 faith-based emojis in 4 rows; real-time subscription for reaction changes |
| Read receipts | Working | `is_read` + `read_at` fields; auto-marked on chat open and tab focus |
| Unread badge counts | Working | Calculated client-side per conversation |
| Message deletion | Working | Sender-only, permanent, cascades reactions |
| Reply/quoting | Working | `reply_to_message_id` FK; shows quoted message in bubble |
| Image attachments | Working | Cloudflare upload via `uploadMessageImage()`; preview before send |
| New chat creation | Working | Friend search dialog; virtual conversation until first message sent |
| Message privacy | Working | 3 levels: everyone / friends only / no one; checked before send |
| Block filtering | Working | Bidirectional; blocked users hidden from conversation list |
| Content filtering | Working | Profanity check + length validation before send |
| Rate limiting | Working | Per-user rate limit on `send_message` action |
| Tab visibility recovery | Working | Refreshes conversations + messages when tab regains focus |
| Typing indicators | NOT in DMs | Only implemented for server channels (Phase 2) |

### Key files
- `src/components/MessagesTab.tsx` (1,917 lines) — DM UI
- `src/hooks/useMessages.ts` (554 lines) — State, sending, reactions, real-time
- `src/hooks/useNewChat.ts` (81 lines) — New chat dialog + friend search
- `src/lib/database/messages.ts` (365 lines) — Message CRUD + reactions
- `src/lib/database/messageHelpers.ts` (176 lines) — Shared reaction/pinning helpers
- `src/lib/database/subscriptions.ts` (143 lines) — Real-time subscription management
- `src/lib/database/privacy.ts` — `canSendMessage()` check
- `src/lib/reactionEmojis.ts` — 24-emoji set
- `src/lib/messageValidation.ts` — Content validation
- `src/lib/cloudinary.ts` — `uploadMessageImage()`

---

## 4. Profile

> **Decision:** Phase 1

### What it does
User profile display and editing, testimony showcase, social actions on other profiles.

### Sub-features
| Sub-feature | Status | Details |
|---|---|---|
| Avatar (emoji or image) | Working | 24 emoji options or Cloudinary upload (10MB; JPG/PNG/GIF/WebP) |
| Display name + username | Working | Required; username validated (3+ chars, alphanumeric + hyphens/underscores) |
| Bio | Working | Required; 500 char max |
| Location | Working | Auto-detect via geolocation; GPS coords stored for discovery |
| Profile card (faith journey) | Working | Church name, denomination, year saved, baptized status, favorite verse, faith interests (15 tags) |
| Testimony display | Working | Full testimony with expand/collapse; view count, likes, comments |
| Profile song (YouTube) | Working | YouTube URL with auto-extracted metadata (title + artist) |
| Online status indicator | Working | Green dot on avatar when `is_online` |
| Church info | Working | Church name in subtitle; ChurchCard on own profile with invite code + member count |
| Profile editing | Working | All fields editable via ProfileEditDialog; real-time validation; sanitized input |
| Profile picture management | Working | Upload to Cloudinary with progress bar; fallback to emoji |
| Profile caching | Working | localStorage cache with 24hr TTL for instant loads |

### Action buttons on other users' profiles
| Button | Condition | Action |
|---|---|---|
| Message | Not blocked | Opens DM |
| Add Friend | No existing relationship | Sends friend request |
| Accept / Decline | Incoming pending request | Accepts/declines friendship |
| Pending | Outgoing pending request | Disabled (waiting) |
| Follow / Following | Profile is public | Toggle follow |
| Report | Not blocked | Opens report dialog |
| Block | Not already blocked | Blocks with confirmation |

### Key files
- `src/components/ProfileTab.tsx` (1,444 lines) — Main profile view
- `src/components/ProfileCard.tsx` — Faith journey card
- `src/components/ProfileEditDialog.tsx` (1,057 lines) — Full profile editing
- `src/components/OtherUserProfileDialog.tsx` — View other users
- `src/components/ProfileCreationWizard.tsx` — Onboarding setup
- `src/components/ChurchCard.tsx` — Church membership display
- `src/components/ImageUploadButton.tsx` — Avatar upload
- `src/components/ChangePictureModal.tsx` — Picture management
- `src/components/LinkSpotify.tsx` (324 lines) — YouTube song linking
- `src/components/useUserProfile.ts` — Clerk-to-Supabase sync hook
- `src/lib/profileCache.ts` — localStorage profile caching

---

## 5. Followers System (Unified — formerly Friends + Followers)

> **Decision:** Phase 1 (merge Friends + Followers into one system; rename to "Followers")

### Current implementation (pre-merge)
Two separate systems exist in code today:

**Friends system** — Bidirectional, requires acceptance:
| Sub-feature | Status | Details |
|---|---|---|
| Send friend request | Working | Creates pending row in `friendships` table |
| Accept request | Working | Updates to accepted + creates reverse friendship (bidirectional) |
| Decline request | Working | Updates status to declined |
| Cancel pending | Working | Deletes via unfriend logic |
| Unfriend | Working | Deletes both directions |
| Friends list | Working | Shows accepted friends with avatar, name, online status |
| Mutual friends detection | Working | `getMutualFriends()` calculates intersection |
| Mutual friends display | Working | Count shown on user cards and friend request cards |
| Friends of friends | Working | `getFriendsOfFriends()` for 2nd-degree discovery; sorted by mutual count |

**Followers system** — One-way, no acceptance needed:
| Sub-feature | Status | Details |
|---|---|---|
| Follow user | Working | Only if profile is public; prevents self-follow + duplicates |
| Unfollow | Working | Simple delete |
| Follower count | Working | Shown on public profiles |
| Following count | Working | Function exists, not displayed in UI |
| Follow status check | Working | `isFollowing()` determines button state |

### Database tables (current)
- `friendships` — id, user_id_1, user_id_2, status (pending/accepted/declined), requested_by, created_at
- `followers` — id, follower_id, following_id, created_at (unique constraint on pair)

### Merge plan
The friend request flow will become a follow/follow-back model in one unified "Followers" system. This merge has not yet been implemented in code.

### Key files
- `src/lib/database/friends.ts` (345 lines) — Friend CRUD + mutual friends
- `src/lib/database/followers.ts` (193 lines) — Follow/unfollow + counts
- `src/components/ProfileTab.tsx` — Friend/follow buttons
- `src/components/NotificationsPanel.tsx` — Friend request notifications
- `src/components/NearbyTab.tsx` — Mutual friends on user cards
- `src/components/UserCard.tsx` — Friend action buttons

---

## 6. Blocking & Reporting

> **Decision:** Phase 1

### What it does
Block/unblock users with bidirectional filtering; report users, testimonies, messages, and groups.

### Blocking sub-features
| Sub-feature | Status | Details |
|---|---|---|
| Block user | Working | One-directional insert; confirmation dialog |
| Unblock user | Working | Delete from blocked_users; managed in Settings |
| Bidirectional filtering | Working | Both directions checked everywhere (search, DMs, conversations, profiles) |
| Blocked users list | Working | Settings > Blocked Users modal; shows avatar, name, "blocked X days ago" |

### Reporting sub-features
| Sub-feature | Status | Details |
|---|---|---|
| Report users | Working | Flag icon on profiles |
| Report testimonies | Working | Via context menus |
| Report messages | Working | Via context menus |
| Report groups | Working | Via context menus |
| Reason categories | Working | 6 reasons per type (harassment, spam, hate speech, etc.) |
| Optional details | Working | Free text, 500 char max |
| False report warning | Working | Yellow banner in report dialog |
| Duplicate prevention | Partial | `hasUserReported()` exists but NOT called in UI |

### Enforcement points
1. Search/discovery (NearbyTab) — blocked users filtered
2. DM conversations — blocked users hidden from list
3. Message sending — blocked users can't send/receive
4. ChatTab conversations — blocked filtered

### Known gaps
- Friend requests can be sent to blocked users (no check in `sendFriendRequest`)
- Blocking doesn't auto-unfriend (friendship remains)
- Report buttons missing from some message context menus

### Key files
- `src/lib/database/blocking.ts` (231 lines) — Block CRUD + batch lookup
- `src/lib/database/reporting.ts` (356 lines) — Report CRUD + admin functions
- `src/components/BlockedUsers.tsx` (295 lines) — Blocked users management UI
- `src/components/ReportContent.tsx` (343 lines) — Report submission modal
- `src/components/AdminDashboard.tsx` — Report review (admin-only, Phase 2)

---

## 7. Notifications Panel

> **Decision:** Phase 1

### What it does
Bell icon with badge count; friend request management; filter tabs.

### Sub-features
| Sub-feature | Status | Details |
|---|---|---|
| Bell icon + badge | Working | Red pulsing badge with unread count in header |
| Friend request cards | Working | Accept/decline buttons; shows sender info + mutual friends |
| Filter tabs | Partial | All / Testimonies / Friends / Church — only Friends filter is functional |
| Polling (30s) | Working | Refreshes pending friend requests every 30 seconds |
| Message badge | Working | Unread DM count from ChatTab |
| Push notification toggle | Partial | Web Push API setup exists; requires VAPID key to be configured |
| Advanced notification prefs | Working | DND, quiet hours, digest mode, per-group mute — all client-side (localStorage) |
| Backend notification feed | Placeholder | Comment in code: "placeholder for future backend"; no notifications table exists |

### What triggers notifications currently
- New friend request → polling picks up pending count
- Unread messages → conversation list recalculated

### What does NOT trigger notifications yet
- Testimony likes/comments
- Mentions
- Church activity
- Server/group events

### Key files
- `src/components/NotificationsPanel.tsx` — Main panel UI
- `src/components/NotificationSettings.tsx` (349 lines) — Advanced prefs (DND, quiet hours, digest)
- `src/components/AppLayout.tsx` — Bell icon + badge rendering
- `src/lib/notifications.ts` — Client-side notification preference logic
- `src/lib/webPush.ts` — Web Push API integration
- `src/contexts/AppContext.tsx` — Notification count polling

---

## 8. Referral System

> **Decision:** Phase 1

### What it does
Ambassador referral program with codes, share links, points, and anti-fraud.

### Sub-features
| Sub-feature | Status | Details |
|---|---|---|
| Referral code generation | Working | `{username}{4 random digits}` format; auto-generated; UNIQUE constraint |
| Share link | Working | `https://lightningsocial.io/ref/{code}`; native share or copy fallback |
| QR code | Working | Toggleable QR code display of referral URL |
| Referral redirect | Working | `/ref/:code` route saves code to localStorage, redirects to signup |
| Referral code input | Working | Optional field in ProfileCreationWizard (step 0); validates on blur |
| Pending referral | Working | Created when referred user completes profile; status = "pending" |
| Referral confirmation | Working | Triggers when referred user creates testimony + completes profile |
| Points award | Working | +1 Blessing Point (BP) + 1 Overall Point (OP) on confirmation |
| Stats tracking | Working | Total referred / confirmed / pending counts |
| Anti-fraud: self-referral prevention | Working | Referrer ID must not equal referred ID |
| Anti-fraud: device fingerprinting | Working | Flags accounts if 3+ share same fingerprint |
| Anti-fraud: account flagging | Working | Flagged users don't earn points (referral still confirmed) |
| Ambassador terms | Working | Must accept terms before first share |
| BP biweekly reset | Working | Resets every 2 weeks (Sunday 7:30 PM PST); snapshots top 3 |
| Leaderboard | Built | Top 7 by BP and OP; personal rank + gap display — NOT integrated in main UI |
| Referral stats UI | Built | MyReferralSection component — NOT integrated in main nav |
| Click tracking | NOT built | No click-through tracking on referral links |

### Database tables
- `referrals` — referrer_id, referred_id, code, status (pending/confirmed/rejected), confirmed_at
- `leaderboard_cache` — type (bp/op), user_id, rank, points, display info
- `bp_cycles` — cycle_start, cycle_end, top_3 (JSONB), is_current
- `device_fingerprints` — user_id, fingerprint (unique pair)
- `bp_reset_dismissals` — user_id, cycle_id (unique pair)
- Users table columns: `referral_code`, `blessing_points`, `overall_points`, `ambassador_terms_accepted_at`, `referred_by_code`, `is_flagged`

### Key files
- `src/components/MyReferralSection.tsx` — Referral stats + share UI (built, not in nav)
- `src/components/AmbassadorTermsModal.tsx` — Terms acceptance
- `src/components/ReferralRedirect.tsx` — URL redirect handler
- `src/components/LeaderboardView.tsx` — BP/OP leaderboards (built, not in nav)
- `src/components/ProfileCreationWizard.tsx` — Referral code input during signup
- `src/lib/database/referrals.ts` — All referral logic (20+ functions)

---

## 9. Settings

> **Decision:** Phase 1 (minus Admin Dashboard, which is Phase 2)

### What it does
App configuration: appearance, privacy, notifications, profile management, legal, support.

### Sub-features
| Section | Sub-feature | Status | Details |
|---|---|---|---|
| **Account** | Edit Profile | Working | Opens ProfileEditDialog with all fields |
| | Change Profile Picture | Working | Opens ChangePictureModal (emoji or Cloudinary upload) |
| | Profile Song | Working | YouTube link with auto-extracted metadata |
| **Appearance** | Night Mode | Working | Toggle; stored in localStorage; applies dark class to `<html>` |
| | Search Radius | Working | 5-100 miles slider; default 25; requires explicit save |
| | Language | Placeholder | Shows "English"; "Coming soon" label |
| **Privacy & Safety** | Who Can Message You | Working | Dropdown: Everyone / Friends Only / No One |
| | Blocked Users | Working | Opens BlockedUsers modal |
| | Report Content | Working | Info alert with instructions |
| **Notifications** | Messages toggle | Working | `notify_messages` boolean synced to DB |
| | Connection Requests toggle | Working | `notify_friend_requests` boolean synced to DB |
| | Nearby Users toggle | Working | `notify_nearby` boolean synced to DB |
| | Push Notifications toggle | Partial | Web Push API; requires VAPID key |
| | Advanced (DND, Quiet Hours, Digest) | Working | Client-side localStorage only |
| **About & Support** | Terms of Service | Working | Scrollable modal; last updated Oct 24, 2025 |
| | Privacy Policy | Working | Scrollable modal; last updated Oct 24, 2025 |
| | Help Center | Working | Searchable FAQ modal |
| | Contact Support | Working | Support request form |
| | Report a Bug | Working | Form with auto-captured system info; saves to localStorage |
| **Account** | Log Out | Working | Confirmation dialog; Clerk signOut |

### Key files
- `src/components/SettingsMenu.tsx` (660 lines) — Main settings UI
- `src/components/ProfileEditDialog.tsx` (1,057 lines) — Profile editing
- `src/components/ChangePictureModal.tsx` — Picture management
- `src/components/LinkSpotify.tsx` (324 lines) — YouTube song linking
- `src/components/BlockedUsers.tsx` (296 lines) — Blocked users list
- `src/components/BugReportDialog.tsx` (307 lines) — Bug report form
- `src/components/ContactSupport.tsx` (348 lines) — Support form
- `src/components/HelpCenter.tsx` — FAQ docs
- `src/components/TermsOfService.tsx` — ToS modal
- `src/components/PrivacyPolicy.tsx` — Privacy modal
- `src/components/NotificationSettings.tsx` (349 lines) — Advanced notification config

---

# PHASE 2 — Gated / Not Yet Accessible

> **Phase gating:** `src/lib/phase.ts` — `export const PHASE = 1;`
> Only 2 files check PHASE: `AppLayout.tsx` and `ChatTab.tsx`
> Changing to `PHASE = 2` enables Home tab + Server rail automatically.

---

## 10. Servers (Discord-Style)

> **Decision:** Phase 2

### What it does
Full Discord-style server system with channels, roles, permissions, and moderation.

### Sub-features (all built, all gated)
| Sub-feature | Status | Details |
|---|---|---|
| Server creation | Built | Emoji/icon, description, public/private |
| Invite codes | Built | Auto-join via invite link |
| Channel categories | Built | Create/reorder categories |
| Channels | Built | Text channels within categories |
| Role-based permissions | Built | Discord-style role hierarchy with granular permissions |
| Member management | Built | Invite, remove, promote, ban, timeout |
| Channel messaging | Built | Real-time with reactions, pinning, edit/delete |
| Typing indicators | Built | Channel-only (not in DMs) |
| Message search | Built | Within-channel search |
| Read status tracking | Built | Per-channel per-user last_read_at |
| @mention support | Built | In channel messages |
| Server ownership transfer | Built | Transfer to another member |
| Channel notification mutes | Built | Per-channel mute settings |
| Audit log | Built | Moderation history viewer |
| Server discovery | NOT built | No public browsing UI |

### Navigation
- Shown in ChatTab horizontal rail when `PHASE >= 2`
- Server icons with auto-generated gradients
- Create button with + icon

### Key files
- `src/components/servers/ServersTab.tsx` (22.7 KB) — Main server interface
- `src/components/servers/ChannelChat.tsx` (58.3 KB) — Channel messages
- `src/components/servers/ChannelSidebar.tsx` (77.8 KB) — Channel/category list
- `src/components/servers/ServerSettings.tsx` (36.8 KB) — Server config
- `src/components/servers/RoleManager.tsx` (20.8 KB) — Permission management
- `src/components/servers/MemberList.tsx` (27.1 KB) — Member admin
- `src/components/servers/AuditLog.tsx` (12.2 KB) — Moderation log
- `src/hooks/useServerState.ts` — Complete server state machine
- `src/lib/database/servers.ts` — 60+ exported functions

### Database tables
servers, server_members, server_channels, server_categories, server_roles, server_role_permissions, channel_messages, channel_message_reactions, server_join_requests, server_bans, server_member_timeouts, server_audit_log, channel_notification_overrides, channel_read_receipts, channel_typing_indicators

---

## 11. Groups

> **Decision:** Phase 2

### What it does
Group system with roles, messaging, and integration with events/announcements.

### Sub-features (all built, no nav path)
| Sub-feature | Status | Details |
|---|---|---|
| Group creation | Built | Public/private with description |
| Role hierarchy | Built | pastor > admin > moderator > member > visitor |
| Custom roles with permissions | Built | Granular permission system |
| Member invitations | Built | Generates join requests |
| Group messaging | Built | Real-time with reactions |
| Pinned messages | Built | Pin/unpin in group chat |
| Group search/discovery | Built | Search function exists |
| Leave/remove members | Built | Role-based permissions enforced |

### Key files
- `src/components/GroupsTab.tsx` — Main groups interface
- `src/hooks/useGroupManagement.ts` — Group CRUD + discovery
- `src/hooks/useGroupChat.ts` — Group messaging
- `src/hooks/useGroupMembers.ts` — Members + roles
- `src/lib/database/groups.ts` — Group database operations

### Database tables
groups, group_members, group_messages, group_message_reactions, group_custom_roles, join_requests, pinned_messages, group_members_custom_roles

---

## 12. Events

> **Decision:** Phase 2

### What it does
Group event system with RSVP, calendar, reminders, and discussion threads.

### Sub-features (all built, accessible only via Groups)
| Sub-feature | Status | Details |
|---|---|---|
| Event creation in groups | Built | Title, description, start/end, location + URL |
| Recurring events | Built | Weekly, biweekly, monthly with auto-instance generation |
| Max capacity limits | Built | Enforced on RSVP |
| RSVP tracking | Built | Going / interested / not going |
| Attendee list | Built | View who's attending |
| Event chat thread | Built | Discussion per event |
| Automated reminders | Built | 24h, 1h, custom minutes |
| Calendar view | Built | Monthly calendar layout |
| Cancel events | Built | Creator/admin action |

### Key files
- `src/components/EventsView.tsx` — Events UI
- `src/lib/database/events.ts` — Event CRUD + RSVP + reminders

### Database tables
group_events, event_rsvps, event_messages, event_reminders

---

## 13. Announcements

> **Decision:** Phase 2

### What it does
Group announcement system with categories, scheduling, read receipts, and broadcast.

### Sub-features (all built, accessible only via Groups)
| Sub-feature | Status | Details |
|---|---|---|
| Create announcements | Built | Title, content, category |
| Categories | Built | info, warning, urgent, celebration, other |
| Pin to top | Built | Sticky announcements |
| Bypass mute | Built | Force notification delivery |
| Schedule publishing | Built | Future date/time scheduling |
| Cross-group broadcast | Built | Post to multiple groups |
| Read receipts | Built | Track who read + when |
| Acknowledgment tracking | Built | Separate from read |
| Scheduled tab | Built | View pending posts |

### Key files
- `src/components/AnnouncementsView.tsx` (1,003 lines) — Announcements UI
- `src/lib/database/announcements.ts` (402 lines) — Announcement CRUD

### Database tables
announcements, announcement_receipts

---

## 14. Churches (Discovery)

> **Decision:** Phase 2

### What it does
Church creation exists; discovery/browsing UI does not.

### Current state
| Sub-feature | Status | Details |
|---|---|---|
| Create church | Built | Name, location, denomination |
| Invite codes | Built | Generate and share |
| Member count | Built | Tracked and displayed |
| Leave church | Built | Member action |
| Church name on profiles | Built | Shows in header + profile card |
| Browse/discover churches | NOT built | No search or listing UI |

### Key files
- `src/components/ChurchCard.tsx` — Church display on profile
- `src/lib/database/churches.ts` — Church CRUD

---

## 15. Home Tab / Feed

> **Decision:** Phase 2

### What it does
Combined DM + Server view; replaces the floating DM button.

### Current state
- Navigation button ready in `AppLayout.tsx` (line 265-275), gated by `PHASE >= 2`
- Shows ChatTab which combines DMs + server rail
- Feed logic (`getFeedTestimonies()`) already exists and works in Charge tab
- Currently at Phase 1, DMs accessed via floating center button instead

---

## 16. Premium (Lightning Pro)

> **Decision:** Phase 2

### What it does
Subscription system with Stripe integration; individual Pro + Church Premium tiers.

### Individual Pro features (all built)
| Sub-feature | Status | Details |
|---|---|---|
| Pro badge | Built | Purple gradient badge with lightning icon (sm/md/lg sizes) |
| Custom accent color | Built | Per-user color customization |
| Animated profile avatar | Built | Glow, pulse, shimmer effects |
| Custom testimony card design | Built | 4 branded templates |
| Extended AI generation | Built | Higher rate limits |
| Profile glow effect | Built | Visual flair |
| Stripe checkout | Built | `functions/api/stripe-checkout.ts` |
| Billing portal | Built | `functions/api/stripe-portal.ts` |
| Webhook handling | Built | `functions/api/stripe-webhook.ts` |
| Trial banner | Built | 30-day free trial display |
| Grace period banner | Built | Post-cancellation grace period |

### Church Premium features (all built)
| Sub-feature | Status | Details |
|---|---|---|
| Custom server banner | Built | Upload + positioning |
| Animated server icon | Built | Glow, pulse, shimmer |
| Verified badge | Built | Church verification |
| Custom accent colors | Built | Primary + secondary |
| Custom invite link slug | Built | Branded URLs |
| Branded testimony templates | Built | Church logo on testimonies |
| AI engagement insights | Built | Shepherd tools |
| Advanced analytics | Built | Usage/engagement data |
| Communication automation | Built | Scheduled messaging |
| Moderation queue | Built | Content review |
| Audit log viewer | Built | Activity history |
| Staff roles | Built | Role management |

### Key files
- `src/components/premium/` — 18 components total
- `src/lib/database/billing.ts` — Subscription queries
- `src/contexts/PremiumContext.tsx` — Premium state provider
- `functions/api/stripe-checkout.ts`, `stripe-portal.ts`, `stripe-webhook.ts`, `subscription-status.ts`

---

## 17. Admin Dashboard

> **Decision:** Phase 2

### What it does
Moderation dashboard for reviewing user reports.

### Sub-features (all built, admin-only)
| Sub-feature | Status | Details |
|---|---|---|
| Report statistics | Built | 4 cards: pending (orange), reviewed (blue), resolved (green), dismissed (gray) |
| Filter by status | Built | All / Pending / Reviewed / Resolved / Dismissed |
| Filter by type | Built | All / User / Testimony / Message / Group |
| Expandable report details | Built | Reporter info, reason, context |
| Status management | Built | Mark as Reviewed / Resolved / Dismissed |

### Key files
- `src/components/AdminDashboard.tsx` — Dashboard UI
- `src/lib/database/reporting.ts` — `getAllReports()`, `getReportCounts()`, `updateReportStatus()`

---

# Summary Matrix

| # | Feature | Phase | Status | Lines of Code (approx) |
|---|---------|-------|--------|----------------------|
| 1 | Testimony Generator | 1 | Working | ~2,500 |
| 2 | Charge Tab (Discovery) | 1 | Working | ~700 |
| 3 | Direct Messaging | 1 | Working | ~3,200 |
| 4 | Profile System | 1 | Working | ~4,500 |
| 5 | Followers (unified) | 1 | Working (merge pending) | ~600 |
| 6 | Blocking & Reporting | 1 | Working | ~1,600 |
| 7 | Notifications Panel | 1 | Partial (backend placeholder) | ~800 |
| 8 | Referral System | 1 | Working (UI not in nav) | ~1,200 |
| 9 | Settings | 1 | Working | ~4,000 |
| 10 | Servers | 2 | Built, gated | ~10,000+ |
| 11 | Groups | 2 | Built, no nav | ~2,500 |
| 12 | Events | 2 | Built, via Groups | ~1,200 |
| 13 | Announcements | 2 | Built, via Groups | ~1,400 |
| 14 | Churches (Discovery) | 2 | Partial | ~300 |
| 15 | Home Tab | 2 | Ready, gated | ~100 (nav only) |
| 16 | Premium / Lightning Pro | 2 | Built, in Settings | ~5,000 |
| 17 | Admin Dashboard | 2 | Built, admin-only | ~500 |

---

# How to Enable Phase 2

Single file change:
```
File: src/lib/phase.ts
Change: export const PHASE = 1;
To:     export const PHASE = 2;
```

This automatically enables:
- Home tab button in bottom navigation
- Server rail + create button in ChatTab
- All server/group/event/announcement UI is already built unconditionally
