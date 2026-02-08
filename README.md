# ⚡ Lightning

**A Christian testimony directory with built-in community features.**

> *"Every generation has a testimony and every testimony has the power to change a generation."*

Lightning is a Christian testimony directory with built-in community features — powered by AI-assisted testimony generation that makes sharing your story as easy as answering four questions.

---

## 🔥 What is Lightning?

Lightning is a **Christian testimony directory** with built-in community features. Communities get their own testimony directory where members can share, discover, and be encouraged by each other's stories.

### For Communities
- **Testimony Directory** — A living, searchable archive of your community's stories
- **Leader Dashboard** — See themes across your community, surface testimonies by topic (identity, anxiety, addiction, healing), and prep messages with real stories from your people
- **Growth Analytics** — Track engagement, new testimonies, and community health
- **Embeddable** — Share your testimony directory on your website, in newsletters, and during services

### For Individuals
- **AI-Powered Testimony Generation** — Answer four guided questions and Lightning crafts your testimony into a shareable story
- **Shareable Testimony Cards** — Beautiful cards optimized for social media that spread your story beyond your church walls
- **Multi-Community Membership** — Belong to multiple communities at once — all in one place
- **Connect & Encourage** — Discover testimonies from people in your community and encourage them directly

---

## 🏗️ Platform Architecture

Lightning is built as a **platform** — not just an app. Christian communities are the core unit, and individuals create testimonies within those spaces.

```
Lightning Platform
├── Communities
│   ├── Testimony Directory (searchable, filterable)
│   ├── Leader Dashboard (analytics, themes, content tools)
│   ├── Member Management (invites, roles, moderation)
├── Individual Profiles
│   ├── Testimony (AI-generated from 4-question framework)
│   ├── Community Memberships (multi-community)
│   └── Shareable Testimony Cards
└── AI Engine
    ├── Testimony Generation (OpenAI)
    ├── Theme Detection (across community testimonies)
    └── Future: Real-time Translation (global reach)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + TypeScript, Tailwind CSS, Vite |
| **Authentication** | Clerk (email, Google, Apple sign-in) |
| **Database** | Supabase (PostgreSQL) |
| **AI** | OpenAI API (testimony generation, theme detection) |
| **Storage** | Supabase Storage (profile images, testimony cards) |
| **Hosting** | TBD |

---

## 📊 Data Model (Core)

```
communities
├── id (uuid)
├── name
├── type (community | group)
├── slug (unique URL path)
└── created_at

community_members
├── id (uuid)
├── community_id → communities
├── user_id → users
├── role (admin | leader | member)
└── joined_at

users
├── id (uuid)
├── clerk_id
├── display_name
├── bio
└── created_at

testimonies
├── id (uuid)
├── user_id → users
├── community_id → communities
├── raw_answers (jsonb — the 4 questions)
├── generated_story (text — AI output)
├── tags (array — topics/themes)
├── visibility (community_only | public)
├── card_image_url
└── created_at
```

---

## 📁 Project Structure

```
/Lightning-App
├── /.claude
│   ├── project_context.md      # AI dev session context
│   ├── known_issues.md         # Active bugs
│   └── api_integrations.md     # Clerk, Supabase, OpenAI setup notes
├── /src
│   ├── /components             # React components
│   ├── /pages                  # Route-level pages
│   ├── /hooks                  # Custom React hooks
│   ├── /lib                    # Supabase client, OpenAI client, utils
│   ├── /types                  # TypeScript types
│   └── App.tsx                 # Root component
├── /supabase
│   └── /migrations             # Database migrations
├── DEVLOG.md                   # Development session log
├── README.md                   # This file
├── package.json
└── .env.local                  # Environment variables (not committed)
```

---

## 🔐 Environment Variables

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

-----

## 🏃 Getting Started

```bash
# Clone the repo
git clone https://github.com/LightningJD/Lightning-App.git
cd Lightning-App

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Clerk, Supabase, and OpenAI keys

# Run development server
npm run dev
```

-----

## 🙏 Mission

**Wear your testimony.**

Lightning exists to make sharing your faith story as natural as posting a photo. By giving every Christian community a testimony directory and every believer a platform, we're building the infrastructure for a generation of Christ followers to encourage each other and reach the world — one story at a time.

-----

## 📜 Legal

- Users must be 13+ (COPPA compliant)
- All testimonies are user-generated content
- AI-generated stories are reviewed and editable by users before publishing
- Community leaders can moderate content within their directory

-----

*Built with 🔥 by Jordyn Lightning*
