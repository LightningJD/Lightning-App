# Supabase Database Setup Guide

## Overview
Lightning uses Supabase as the backend database. This guide walks you through setting up your Supabase project and connecting it to Lightning.

## Step 1: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

## Step 2: Create New Project

1. Click "New Project"
2. **Organization:** Create new organization or use existing
3. **Project Name:** `Lightning`
4. **Database Password:** Create a strong password (save this!)
5. **Region:** Choose closest to your users (e.g., `us-east-1`)
6. Click "Create new project"

⏳ **Wait 2-3 minutes** for project to provision

## Step 3: Get Your API Keys

1. Once project is ready, go to **Settings** (gear icon) → **API**
2. You'll see two keys:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
3. Copy both - we'll add them to `.env.local`

## Step 4: Add Credentials to Project

Add these to your `.env.local` file:

```env
# Clerk Authentication (already there)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 5: Create Database Schema

We'll create 9 tables for Lightning. Go to **SQL Editor** in Supabase dashboard and run the schema script (I'll provide this).

### Tables to Create:
1. **users** - User profiles
2. **testimonies** - User testimonies
3. **friendships** - Friend connections
4. **messages** - Direct messages
5. **groups** - Group information
6. **group_members** - Group membership
7. **group_messages** - Group chat messages
8. **join_requests** - Pending group joins
9. **notifications** - User notifications

## Database Schema Features

### Users Table
- Synced with Clerk authentication
- Stores profile info (bio, avatar, location)
- Music/Spotify links
- Testimony status

### Testimonies Table
- 4-paragraph format
- AI-generated content
- Lessons learned
- Privacy settings

### Real-time Features
- WebSocket subscriptions for messages
- Live online status
- Instant notifications

### Location Features
- PostGIS extension for geospatial queries
- Find nearby users by distance
- Privacy controls

## Step 6: Set Up Row Level Security (RLS)

Supabase uses RLS to secure data. We'll create policies that:
- Users can only edit their own profile
- Messages visible only to sender/recipient
- Private testimonies hidden from non-friends
- Group messages visible only to members

## Step 7: Enable Realtime

1. Go to **Database** → **Replication**
2. Enable realtime for these tables:
   - ✅ messages
   - ✅ group_messages
   - ✅ notifications
   - ✅ users (for online status)

## Cost Breakdown

Supabase Free Tier includes:
- ✅ 500 MB database space
- ✅ 1 GB file storage
- ✅ 2 GB bandwidth
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests
- ✅ Real-time subscriptions

**Perfect for Lightning MVP!**

## Next Steps After Setup

Once Supabase is configured:
1. Install Supabase client library
2. Create database helper functions
3. Sync Clerk users to Supabase
4. Replace hardcoded data with real queries
5. Test authentication + database flow

## Troubleshooting

### Can't connect to Supabase
- Verify URL and anon key are correct
- Check `.env.local` has no extra spaces
- Restart dev server after adding keys

### RLS policies blocking queries
- Check policies in Supabase dashboard
- Verify JWT token is being sent
- Test with RLS disabled first (dev only!)

### Realtime not working
- Enable replication for tables
- Check WebSocket connection in browser
- Verify subscription setup in code

## Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Discord:** https://discord.supabase.com
- **React Guide:** https://supabase.com/docs/guides/getting-started/quickstarts/reactjs
- **RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security

---

**Status:** Waiting for you to create Supabase account and get API keys.

Once you have your credentials, we'll install the client library and create the database schema!
