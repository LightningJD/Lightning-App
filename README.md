# ⚡ Lightning

A faith-based social platform for sharing testimonies and connecting believers.

## 🚀 Live Demo

**Production:** [https://lightningsocial.io](https://lightningsocial.io)

## 📖 About

Lightning is a modern web application built to help people share their faith testimonies, connect with nearby believers, and build meaningful spiritual communities.

### ✨ Features

- 📝 **Testimony Sharing** - Write and share your faith journey
- 👥 **Social Connection** - Find and connect with believers nearby
- 💬 **Real-time Messaging** - Direct messages and group chats
- 🎵 **Music Integration** - Link Spotify tracks to your testimonies
- 🌙 **Dark Mode** - Beautiful light/dark theme support
- 🔒 **Privacy Controls** - Granular privacy settings for testimonies and messages
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile

## 🛠️ Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Authentication:** Clerk
- **Database:** Supabase (PostgreSQL + PostGIS)
- **File Storage:** Cloudinary
- **Hosting:** Cloudflare Pages
- **Error Tracking:** Sentry
- **Icons:** Lucide React

## 🏗️ Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/LightningJD/Lightning-App.git
   cd lightning
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env.local` file in the root directory:
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5173`

### Build

```bash
npm run build
```

### Type Check

```bash
npm run type-check
```

## 📚 Documentation

- **[ROADMAP.md](docs/ROADMAP.md)** - Product roadmap and feature status
- **[SECURITY.md](docs/SECURITY.md)** - Security documentation and best practices
- **[SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)** - Database setup guide
- **[CLERK_SETUP.md](docs/CLERK_SETUP.md)** - Authentication setup guide
- **[CLOUDINARY_SETUP.md](docs/CLOUDINARY_SETUP.md)** - Image upload setup guide

## 🚀 Deployment

The app is automatically deployed to Cloudflare Pages on every push to `main` branch.

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** 18+

Environment variables must be configured in the Cloudflare Pages dashboard.

## 📊 Project Status

**Current Phase:** Production Ready ✅

- ✅ Core features complete
- ✅ TypeScript migration complete (100% type safety)
- ✅ Security hardening complete
- ✅ Deployed to Cloudflare Pages
- 🔄 Active development on new features

See [ROADMAP.md](docs/ROADMAP.md) for detailed status.

## 🤝 Contributing

This is currently a private project. If you'd like to contribute, please reach out to the repository owner.

## 📄 License

All rights reserved. This project is not open source.

## 🙏 Acknowledgments

Built with ❤️ to help people share their faith and connect with other believers.

---

**Deployed on:** [Cloudflare Pages](https://pages.cloudflare.com/)
**Repository:** [github.com/LightningJD/Lightning-App](https://github.com/LightningJD/Lightning-App)
