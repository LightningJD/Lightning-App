# Supabase Quick Start (5 minutes)

## What We Just Built

✅ **Supabase Client Library** - Installed and configured
✅ **Database Schema** - Complete SQL script ready (9 tables, RLS, indexes)
✅ **Helper Functions** - 20+ database operations ready to use
✅ **Auto-Sync** - Clerk users automatically sync to Supabase on login

## Your Next Actions

### Step 1: Create Supabase Project (2 minutes)

1. Go to **https://supabase.com** and sign up
2. Click **"New Project"**
3. Fill in:
   - **Name:** Lightning
   - **Database Password:** (create strong password - save it!)
   - **Region:** us-east-1 (or closest to you)
4. Click **"Create new project"**
5. ⏳ Wait 2-3 minutes for provisioning

### Step 2: Get API Keys (1 minute)

1. Go to **Settings** (gear icon) → **API**
2. Copy these two values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### Step 3: Add Keys to .env.local (30 seconds)

Open `.env.local` and paste your keys:

```env
# Clerk Authentication (already there)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Supabase Database (add these)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Create Database Schema (1 minute)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `/supabase/schema.sql`
4. Paste into SQL Editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. You should see: ✅ **"Lightning database schema created successfully!"**

### Step 5: Enable Realtime (30 seconds)

1. Go to **Database** → **Replication**
2. Enable realtime for these tables:
   - ✅ **messages**
   - ✅ **group_messages**
   - ✅ **notifications**
   - ✅ **users**

### Step 6: Test the Connection (30 seconds)

1. Restart dev server: `Ctrl+C` then `npm run dev`
2. Refresh browser at http://localhost:5173
3. Sign in to your Clerk account
4. Your user will automatically sync to Supabase!
5. Check in Supabase dashboard → **Table Editor** → **users** table

## What Happens Next

Once you complete these steps:

### ✅ Automatic User Sync
- Every Clerk login/signup automatically creates Supabase user
- Profile data synced between Clerk and database
- UUID assigned for all database operations

### ✅ Ready Database Operations
- Create testimonies → saved to database
- Send messages → real-time delivery
- Join groups → membership tracked
- Find nearby users → location-based queries

### ✅ Real-time Features
- Live message notifications
- Online status updates
- Group chat updates
- Instant friend requests

## File Structure Created

```
lightning/
├── .env.local                    # API keys (add Supabase credentials)
├── supabase/
│   └── schema.sql                # Complete database schema (run in SQL Editor)
├── src/
│   ├── lib/
│   │   ├── supabase.js          # Supabase client configuration
│   │   └── database.js          # 20+ helper functions
│   └── components/
│       └── useUserProfile.js     # Updated with auto-sync
└── docs/
    ├── SUPABASE_SETUP.md         # Detailed guide
    └── SUPABASE_QUICKSTART.md    # This file
```

## Database Schema Overview

### 9 Tables Created:
1. **users** - User profiles with location
2. **testimonies** - 4-paragraph testimonies
3. **friendships** - Friend connections
4. **messages** - Direct messages
5. **groups** - Group information
6. **group_members** - Group membership
7. **group_messages** - Group chat
8. **join_requests** - Pending group joins
9. **notifications** - User notifications

### Features:
- ✅ Row Level Security (RLS) enabled
- ✅ 20+ indexes for fast queries
- ✅ PostGIS for location features
- ✅ Automatic timestamps
- ✅ Geospatial queries (nearby users)
- ✅ Realtime subscriptions

## Available Helper Functions

Once Supabase is configured, you can use:

### User Operations
```javascript
import { syncUserToSupabase, getUserByClerkId, updateUserLocation } from './lib/database';

// Auto-synced on login, or manually:
await syncUserToSupabase(clerkUser);

// Get user profile
const user = await getUserByClerkId(clerkUserId);

// Update location
await updateUserLocation(userId, lat, lng);

// Find nearby users
const nearby = await findNearbyUsers(lat, lng, 25); // 25 mile radius
```

### Testimony Operations
```javascript
import { createTestimony, getTestimonyByUserId } from './lib/database';

// Create testimony (connected to testimony flow)
await createTestimony(userId, {
  content: generatedTestimony,
  question1: answer1,
  question2: answer2,
  question3: answer3,
  question4: answer4,
  lesson: lessonText
});
```

### Message Operations
```javascript
import { sendMessage, getConversation, subscribeToMessages } from './lib/database';

// Send DM
await sendMessage(senderId, recipientId, "Hello!");

// Get conversation
const messages = await getConversation(userId1, userId2);

// Real-time subscription
const sub = subscribeToMessages(userId, (newMessage) => {
  console.log('New message:', newMessage);
});
```

## Costs

Supabase Free Tier:
- ✅ 500 MB database space
- ✅ 1 GB file storage
- ✅ 2 GB bandwidth
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests

**Perfect for Lightning MVP!**

## Troubleshooting

### "Cannot connect to Supabase"
→ Check URL and anon key in `.env.local`
→ Restart dev server after adding keys

### "Schema failed to create"
→ Make sure you copied the entire `schema.sql` file
→ Check for syntax errors in SQL Editor
→ Run each section separately if needed

### "Users not syncing"
→ Check Supabase dashboard → Table Editor → users
→ Check browser console for errors
→ Verify RLS policies are enabled

### "Realtime not working"
→ Enable replication for tables in Database → Replication
→ Check WebSocket connection in browser console
→ Verify subscription setup

## Next Steps (Week 2)

After Supabase is working:

1. **Week 1, Day 7:** Integration testing checkpoint
2. **Week 2:** Connect testimony flow to database
3. **Week 2:** Implement real messages & groups
4. **Week 2:** Add location-based nearby users
5. **Week 2:** Real-time notifications

---

**Status:** Waiting for your Supabase credentials!

Once you add them to `.env.local` and run the schema, everything will be connected! 🚀
