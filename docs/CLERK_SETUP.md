# Clerk Authentication Setup Guide

## Overview
Lightning now uses Clerk for authentication. This guide will walk you through setting up your Clerk account and configuring the app.

## Step 1: Create Clerk Account

1. Go to [https://clerk.com](https://clerk.com)
2. Click "Start Building for Free"
3. Sign up with your email or GitHub account
4. Verify your email address

## Step 2: Create Lightning Application

1. After signing in, click "Create Application"
2. Application Name: `Lightning`
3. Choose authentication methods you want to enable:
   - ✅ **Email** (recommended - required)
   - ✅ **Google** (optional - good for user experience)
   - ✅ **Facebook** (optional)
   - ⬜ **GitHub** (optional)
   - ⬜ **Twitter** (optional)
4. Click "Create Application"

## Step 3: Get Your API Keys

1. After creating the application, you'll see the Quick Start page
2. Look for your **Publishable Key** - it starts with `pk_test_`
3. Copy the Publishable Key
4. Open your `.env.local` file in the project root
5. Replace `your_clerk_publishable_key_here` with your actual key:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
```

## Step 4: Configure Application Settings

### Profile Settings
1. In Clerk dashboard, go to "User & Authentication" → "Email, Phone, Username"
2. Enable **Username**:
   - Make it required
   - This will be used as the Lightning username
3. Configure email settings as desired

### Appearance Customization (Optional)
1. Go to "Customization" → "Theme"
2. Set primary color to match Lightning's blue: `#4facfe`
3. Upload Lightning logo if desired

### Metadata Configuration
1. Go to "User & Authentication" → "Metadata"
2. Add these public metadata fields for Lightning profiles:
   - `bio` (string) - User bio
   - `hasTestimony` (boolean) - Whether user has created testimony
   - `testimony` (string) - Generated testimony text
   - `testimonyLesson` (string) - Testimony lesson
   - `location` (object) - User location for nearby feature
   - `music` (object) - Spotify integration data
   - `story` (object) - User's testimony story

## Step 5: Test Authentication

1. Restart your development server:
```bash
npm run dev
```

2. Open http://localhost:5173 in your browser
3. You should see the Clerk sign-in page with Lightning branding
4. Create a test account
5. After signing in, you'll be redirected to the Lightning app

## Step 6: Production Deployment (Future)

When deploying to production:

1. In Clerk dashboard, go to "API Keys"
2. Create a **Production** instance
3. Copy the production `VITE_CLERK_PUBLISHABLE_KEY`
4. Add it to your production environment variables
5. Update allowed domains in Clerk dashboard under "Domains"

## Troubleshooting

### "Configuration Error" Message
- Check that `.env.local` file exists in project root
- Verify the key starts with `pk_test_` or `pk_live_`
- Restart the dev server after adding the key

### "Invalid Publishable Key"
- Make sure you copied the entire key
- No extra spaces before/after the key
- Key should be from Clerk dashboard, not from docs

### Sign-in page not showing branding
- Check that `SignInPage.jsx` and `SignUpPage.jsx` are in `/src/components/`
- Verify Tailwind CSS is working (check other pages)
- Clear browser cache

### Redirects not working
- Check browser console for errors
- Verify React Router is installed: `npm list react-router-dom`
- Check that AuthWrapper.jsx is properly wrapping App in main.jsx

## Current Status

✅ Clerk SDK installed
✅ Authentication wrapper created
✅ Sign-in/Sign-up pages created
✅ User profile sync configured
✅ Sign-out functionality added
⏳ Clerk application needs to be created (your action)
⏳ API key needs to be added to `.env.local` (your action)

## Next Steps After Clerk Setup

Once Clerk is configured and working:

1. **Week 1, Days 4-6:** Set up Supabase database
2. **Week 1, Day 7:** Integration testing
3. Create user profile sync with Supabase
4. Implement location-based features
5. Add Spotify integration

## Free Tier Limits

Clerk free tier includes:
- ✅ Up to 10,000 monthly active users
- ✅ Unlimited applications
- ✅ Email/password authentication
- ✅ Social OAuth (Google, Facebook, etc.)
- ✅ Pre-built UI components
- ✅ User management dashboard

Perfect for Lightning MVP and initial growth!

## Support Resources

- **Clerk Documentation:** https://clerk.com/docs
- **Clerk Discord:** https://clerk.com/discord
- **React Integration Guide:** https://clerk.com/docs/quickstarts/react
- **Vite Guide:** https://clerk.com/docs/quickstarts/vite
