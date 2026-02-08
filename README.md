# ⚡ Lightning - Christian Social Testimony Directory

> **Connect with believers. Share your faith journey. Build community.**

A modern, faith-based social platform where Christians share testimonies, find nearby believers, and build authentic spiritual communities through AI-powered features and real connections.

---

## 🌐 Live App

**Production:** [https://lightningsocial.io](https://lightningsocial.io)

**Status:** ✅ Production Ready | 🚀 Actively Deployed | 📈 Ready for Beta Users

---

## 📖 About Lightning

Lightning is a Christian social testimony directory that helps believers:
- 📝 **Write and share faith testimonies** with AI-powered assistance
- 👥 **Find nearby Christians** using location-based matching (5-100 mile radius)
- 💬 **Connect through real-time messaging** - DMs and group chats
- 🙏 **Build spiritual communities** through groups and shared experiences
- 🎵 **Express faith through music** - Link YouTube songs to testimonies
- 🏆 **Grow in faith** through gamification (hidden achievements & milestones)

### 🎯 Target Audience

Christians seeking:
- Authentic faith-based connections
- A safe space to share testimonies
- Local believers for in-person fellowship
- Meaningful spiritual community online

---

## ✨ Core Features

### 🙏 Testimony Sharing
- **AI-Powered Creation** - Guided testimony builder with smart prompts
- **Rich Formatting** - Add music, images, and structured content
- **Privacy Controls** - Public, friends-only, or private testimonies
- **Engagement** - Like, comment, and encourage others
- **Search & Discovery** - Find testimonies by topic, location, or user

### 👥 Social Connections
- **Friend Requests** - Send/accept/decline friend requests
- **Nearby Believers** - Location-based discovery (configurable radius)
- **User Profiles** - Avatar emojis, bios, locations, faith journeys
- **Blocking & Reporting** - Safe community with moderation tools
- **Privacy Settings** - Control profile visibility and message permissions

### 💬 Real-Time Messaging
- **Direct Messages** - One-on-one conversations
- **Group Chats** - Create and manage spiritual communities
- **Message Reactions** - Emoji reactions to messages
- **Pin Messages** - Highlight important discussions
- **Online Status** - See who's active now
- **Privacy Controls** - Control who can message you

### 🔐 Privacy & Safety
- **Granular Privacy** - Control testimony visibility, profile access, messaging
- **Blocking System** - Two-way blocking with complete filtering
- **Content Reporting** - Report users, testimonies, or inappropriate content
- **Admin Moderation** - Review queue for reported content
- **Rate Limiting** - Prevents spam and abuse
- **Input Validation** - XSS/SQL injection protection

### 🏆 Gamification (Hidden Features)
- **Secret Achievements** - Unlock rewards for spiritual milestones
- **Activity Tracking** - Message streaks, early bird/night owl badges
- **Faith Milestones** - First testimony, 100 messages, 7-day streaks
- **Discovery System** - Hidden secrets revealed through usage

### 🎨 User Experience
- **🌙 Dark Mode** - Beautiful light/dark theme (auto-switching)
- **📱 Responsive** - Perfect on phones, tablets, and desktop
- **⚡ Fast** - Global CDN, optimized performance
- **🎵 Music Player** - Embedded YouTube player for testimony songs
- **🔔 Notifications** - Customizable alerts for messages, friend requests
- **🌍 Location Services** - PostGIS-powered radius search

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - Latest features with concurrent rendering
- **TypeScript** - 100% type-safe codebase (21,000+ lines)
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icon library

### Backend & Services
- **Clerk** - Modern authentication (email, social login)
- **Supabase** - PostgreSQL database + PostGIS + real-time
- **Cloudinary** - Image upload and optimization
- **Sentry** - Error monitoring with session replay

### Infrastructure
- **Cloudflare Pages** - Global CDN, unlimited bandwidth
- **GitHub Actions** - Automated CI/CD
- **Playwright** - Autonomous E2E testing (61 tests)
- **Vitest** - Unit testing (193+ tests)

---

## 📊 Project Stats

| Metric | Value |
|--------|-------|
| **Production Code** | ~21,000 lines |
| **Components** | 30 React components |
| **Libraries** | 16 utility modules |
| **Database Tables** | 13 tables |
| **E2E Tests** | 61 automated tests |
| **Unit Tests** | 193+ tests |
| **Type Safety** | 100% TypeScript |
| **Test Coverage** | Core features covered |
| **Deployment** | Automated via GitHub |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# 1. Clone repository
git clone https://github.com/LightningJD/Lightning-App.git
cd Lightning-App

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# 4. Run development server
npm run dev

# 5. Open browser
# Navigate to http://localhost:5173
```

### Environment Variables

Create `.env.local` with:

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Supabase Database
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Cloudinary Images
VITE_CLOUDINARY_CLOUD_NAME=your_cloud
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset

# Sentry Error Monitoring (Optional)
VITE_SENTRY_DSN=https://...
```

See setup guides in `/docs` folder for detailed instructions.

---

## 🧪 Testing

Lightning has comprehensive autonomous testing:

### Run All Tests
```bash
# Unit tests
npm run test

# E2E tests (autonomous browser testing)
npm run test:e2e

# Run both
npm run test:all

# Watch mode
npm run test:ui

# Coverage report
npm run test:coverage
```

### E2E Testing Features
- ✅ **61 automated tests** across 6 test suites
- ✅ **Autonomous AI testing** - clicks buttons, fills forms
- ✅ **Multi-browser** - Chrome, Firefox, Safari, Mobile
- ✅ **Screenshot on failure** - visual debugging
- ✅ **Parallel execution** - fast test runs
- ✅ **CI/CD integration** - runs on every push

Test suites:
- `e2e/friend-requests.spec.ts` - Friend request flows (7 tests)
- `e2e/messaging.spec.ts` - Direct messages & groups (10 tests)
- `e2e/groups.spec.ts` - Group management (13 tests)
- `e2e/settings-privacy.spec.ts` - Privacy & settings (16 tests)
- `e2e/testimonies.spec.ts` - Testimony CRUD (8 tests)
- `e2e/profile.spec.ts` - Profile viewing & editing (7 tests)

See [AUTONOMOUS_TESTING.md](AUTONOMOUS_TESTING.md) for details.

---

## 📁 Project Structure

```
Lightning-App/
├── src/
│   ├── components/        # 30 React components
│   │   ├── AuthWrapper.tsx
│   │   ├── NearbyTab.tsx
│   │   ├── MessagesTab.tsx
│   │   ├── GroupsTab.tsx
│   │   ├── ProfileTab.tsx
│   │   └── ...
│   ├── lib/              # 16 utility libraries
│   │   ├── database/     # Database operations (modular)
│   │   ├── secrets.ts    # Gamification system
│   │   ├── validation.ts # Input validation
│   │   ├── sanitization.ts # XSS protection
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   ├── contexts/         # React context providers
│   ├── types/            # TypeScript definitions
│   └── test/             # Unit tests (193+ tests)
├── e2e/                  # E2E tests (61 tests)
├── docs/                 # Comprehensive documentation
├── supabase/             # Database migrations & types
└── public/               # Static assets
```

---

## 📚 Documentation

### Setup Guides
- [Quick Start](docs/QUICK_START.md) - Get running in 5 minutes
- [Supabase Setup](docs/SUPABASE_SETUP.md) - Database configuration
- [Clerk Setup](docs/CLERK_SETUP.md) - Authentication setup
- [Cloudinary Setup](docs/CLOUDINARY_SETUP.md) - Image uploads

### Development Docs
- [Roadmap](docs/ROADMAP.md) - Feature roadmap & progress
- [Security](docs/SECURITY.md) - Security best practices
- [Developer Handoff](docs/DEVELOPER_HANDOFF.md) - Onboarding guide
- [TypeScript Audit](docs/TYPESCRIPT_AUDIT.md) - Type safety report

### Testing Docs
- [Autonomous Testing](AUTONOMOUS_TESTING.md) - AI-powered E2E testing
- [Running Tests Guide](RUNNING_TESTS_GUIDE.md) - Test execution
- [Bugs Fixed Summary](BUGS_FIXED_SUMMARY.md) - Recent bug fixes

### Deployment
- [Cloudflare Migration](docs/CLOUDFLARE_MIGRATION_GUIDE.md) - Hosting setup
- [Database Backup](docs/DATABASE_BACKUP_GUIDE.md) - Backup procedures

---

## 🏗️ Recent Development (Feb 2026)

### Latest Updates
- ✅ **Autonomous Testing Infrastructure** - 61 E2E tests, AI-powered
- ✅ **Bug Fixes** - Fixed 15 silent failure bugs (user feedback)
- ✅ **User Search** - Search for users with seamless UI
- ✅ **Search Radius** - Configurable 5-100 mile radius
- ✅ **Test Coverage** - 193+ unit tests, 61 E2E tests
- ✅ **Quality Improvements** - Better error handling, toast notifications

### Recent Commits
```
99257ee - Fix EditTestimonyDialog.tsx - Add missing toast notifications
3b6c9be - Add comprehensive summary of all bug fixes
9274e99 - Fix silent failure bugs in ProfileCreationWizard and ProfileTab
b907407 - Fix 10 silent failure bugs in GroupsTab.tsx
83aa26d - Add comprehensive autonomous test suite (61 tests total)
```

See [BUGS_FIXED_SUMMARY.md](BUGS_FIXED_SUMMARY.md) for details on recent fixes.

---

## 🎯 Current Status

**Phase:** Production Ready ✅

### Completed
- ✅ Core features (testimonies, messaging, groups, profiles)
- ✅ Authentication & authorization (Clerk)
- ✅ Database & real-time (Supabase)
- ✅ Privacy & safety features (blocking, reporting, moderation)
- ✅ Settings & preferences (16/17 features)
- ✅ TypeScript migration (100% type-safe)
- ✅ Autonomous testing (61 E2E + 193+ unit tests)
- ✅ Production deployment (Cloudflare Pages)
- ✅ Error monitoring (Sentry)
- ✅ Performance optimization
- ✅ Security hardening (XSS, SQL injection, rate limiting)

### Ready For
- 🎯 **Beta launch** - Ready for first 50 users
- 🎯 **User feedback** - All core features working
- 🎯 **Scale testing** - Infrastructure ready for growth

See [ROADMAP.md](docs/ROADMAP.md) for detailed roadmap.

---

## 🚀 Deployment

### Automatic Deployment
- **Platform:** Cloudflare Pages
- **Trigger:** Push to `main` branch
- **Build:** `npm run build`
- **Output:** `dist/`
- **URL:** https://lightningsocial.io
- **Custom Domain:** Configured with DNS

### Manual Deployment
```bash
# Build for production
npm run build

# Preview locally
npm run preview
```

### Environment Setup
Configure these in Cloudflare Pages dashboard:
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`
- `VITE_SENTRY_DSN` (optional)

---

## 🤝 Contributing

This is currently a private project. Contributions are welcome from team members.

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Run `npm run test:all` to verify
4. Submit pull request for review
5. Merge after approval and passing tests

### Code Quality
- ✅ TypeScript required (no `any` types)
- ✅ Tests required for new features
- ✅ Error handling required (try/catch + toast)
- ✅ Input validation required (all user inputs)
- ✅ Security review for auth/database changes

---

## 🙏 Mission & Values

**Mission:** Help Christians share their faith testimonies and build authentic spiritual communities through technology.

**Values:**
- 🙏 **Faith-First** - Biblical principles guide design
- 💙 **Authenticity** - Real stories, real connections
- 🔒 **Safety** - Protected community with moderation
- 🌍 **Accessibility** - Available to believers everywhere
- ⚡ **Excellence** - Quality code, great UX

---

## 📄 License

All rights reserved. This project is not open source.

© 2026 Lightning App. Built with ❤️ for the faith community.

---

## 📞 Support

- **Email:** support@lightning-app.dev
- **Bug Reports:** [GitHub Issues](https://github.com/LightningJD/Lightning-App/issues)
- **Documentation:** `/docs` folder

---

## 🙌 Acknowledgments

**Built with:**
- React, TypeScript, Vite, Tailwind CSS
- Clerk, Supabase, Cloudinary, Sentry
- Cloudflare Pages, GitHub Actions, Playwright

**Special thanks to:**
- The Christian community for inspiration
- All beta testers and early users
- Open source maintainers

---

**Live App:** [https://lightningsocial.io](https://lightningsocial.io)

**Repository:** [github.com/LightningJD/Lightning-App](https://github.com/LightningJD/Lightning-App)

---

*Last Updated: February 8, 2026*
