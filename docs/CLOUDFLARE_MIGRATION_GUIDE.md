# Cloudflare Pages Migration Guide

**Migration Date**: October 24, 2025
**Estimated Time**: 30 minutes
**Risk Level**: Very Low (can revert anytime)

---

## Pre-Migration Checklist

✅ **Current Environment Variables Documented** (see below)
✅ **Code committed to GitHub** (latest: Phase 1.75 & 1.5 complete)
✅ **Netlify site still live** (can use as backup)
✅ **No code changes needed** (pure infrastructure migration)

---

## Step 1: Create Cloudflare Account (5 minutes)

### Actions:
1. Go to: **https://pages.cloudflare.com**
2. Click **"Sign up"** (top right)
3. Use your email and create password
4. Verify email
5. You'll be redirected to Cloudflare dashboard

**Expected Result**: You should see the Cloudflare Pages dashboard

---

## Step 2: Connect GitHub Repository (2 minutes)

### Actions:
1. Click **"Create a project"** button
2. Click **"Connect to Git"**
3. Choose **GitHub**
4. Click **"Authorize Cloudflare Pages"** (GitHub authorization popup)
5. Select **"Only select repositories"**
6. Choose **"lightning"** repository
7. Click **"Install & Authorize"**

**Expected Result**: You should see your `lightning` repository listed

---

## Step 3: Configure Build Settings (3 minutes)

### Actions:
1. Click on **"lightning"** repository
2. Fill in the following settings:

**Project Name**: `lightning` (or any name you prefer)

**Production Branch**: `main`

**Framework Preset**: Select **"Create React App"** (or leave as "None")

**Build Command**:
```bash
npm run build
```

**Build Output Directory**:
```bash
dist
```

**Root Directory**: (leave blank)

**Build Comments**: Enabled (for deploy previews)

3. **DO NOT click "Save and Deploy" yet** - we need to add environment variables first

---

## Step 4: Add Environment Variables (10 minutes)

### Actions:
1. Scroll down to **"Environment Variables"** section
2. Click **"Add variable"** for each of the following:

**Variable 1:**
- Variable name: `VITE_CLERK_PUBLISHABLE_KEY`
- Value: `pk_test_d2VhbHRoeS1tb3VzZS02NC5jbGVyay5hY2NvdW50cy5kZXYk`

**Variable 2:**
- Variable name: `VITE_SUPABASE_URL`
- Value: `https://wsyhpxnzsuxnylgqvcti.supabase.co`

**Variable 3:**
- Variable name: `VITE_SUPABASE_ANON_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzeWhweG56c3V4bnlsZ3F2Y3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODcxNDcsImV4cCI6MjA3NjQ2MzE0N30.9KgfzAVwf7gHrPYqTpo_TcZbJg_ori9vaHBf4MvAHz4`

**Variable 4:**
- Variable name: `VITE_CLOUDINARY_CLOUD_NAME`
- Value: `ddkgphfxe`

**Variable 5:**
- Variable name: `VITE_CLOUDINARY_UPLOAD_PRESET`
- Value: `lightning_uploads_v2`

**Variable 6 (if you set up Sentry):**
- Variable name: `VITE_SENTRY_DSN`
- Value: `[Your Sentry DSN from sentry.io]` (add this later if you haven't set up Sentry yet)

### Important Notes:
- ✅ Make sure there are **NO extra spaces** before or after the values
- ✅ All variables should be set for **"Production and Preview"** (default)
- ✅ Double-check spelling of variable names (must match exactly)

---

## Step 5: Deploy (5 minutes)

### Actions:
1. Click **"Save and Deploy"** (bottom of page)
2. Watch the build log (you'll see):
   - Installing dependencies (~1 min)
   - Building React app (~1 min)
   - Deploying to Cloudflare network (~30 sec)
3. Wait for **"Success! Your site is live!"** message

**Expected Result**: You should see:
- ✅ Build status: Success
- ✅ Deployment URL: `https://lightning-xxx.pages.dev` (or your custom name)

### Copy Your New URL:
```
https://[your-project-name].pages.dev
```

---

## Step 6: Test Everything (5 minutes)

### Actions:
Visit your new Cloudflare Pages URL and test:

**1. Basic Load**
- ✅ Site loads without errors
- ✅ No console errors in browser DevTools (F12)

**2. Authentication (Clerk)**
- ✅ Click "Sign in" button
- ✅ Sign in with your test account
- ⚠️ **Expected**: Might get "Invalid domain" error (we'll fix in Step 7)

**3. If Sign In Works:**
- ✅ Profile tab loads
- ✅ Messages tab loads
- ✅ Groups tab loads
- ✅ Connect tab loads

**4. Supabase Connection**
- ✅ Your profile data appears
- ✅ Messages load (if any)
- ✅ Groups load (if any)

**5. Cloudinary Upload** (if sign in works)
- ✅ Try uploading profile picture
- ✅ Image should upload and display

### If Everything Works:
🎉 **Migration successful!** Proceed to Step 7 to finalize.

### If Sign In Doesn't Work:
⚠️ **Expected** - we need to add Cloudflare domain to Clerk. Proceed to Step 7.

---

## Step 7: Update Clerk Authorized Domains (2 minutes)

### Why Needed:
Clerk blocks authentication from domains not on the allowlist. We need to add your new Cloudflare URL.

### Actions:
1. Go to: **https://dashboard.clerk.com**
2. Select your **Lightning** application
3. In left sidebar, click **"Developers"**
4. Click **"Allowed origins"** (or "Domains")
5. Click **"Add domain"**
6. Enter your Cloudflare Pages URL: `https://[your-project-name].pages.dev`
7. Click **"Add"** or **"Save"**

**Alternative Path** (if UI is different):
- Settings → API Keys → Allowed origins
- Add your Cloudflare Pages domain

### Test Again:
1. Go back to your Cloudflare Pages URL
2. Try signing in
3. ✅ Should work now!

---

## Step 8: Final Verification (3 minutes)

### Complete Testing Checklist:

**Authentication:**
- ✅ Sign in works
- ✅ Sign out works
- ✅ User profile loads

**Database (Supabase):**
- ✅ Profile data displays
- ✅ Testimonies load
- ✅ Messages load
- ✅ Groups load
- ✅ Friends/connections load

**Image Upload (Cloudinary):**
- ✅ Change profile picture
- ✅ Image uploads successfully
- ✅ Image displays on profile

**Core Features:**
- ✅ Send a test message
- ✅ Create a test group
- ✅ Update profile bio
- ✅ Toggle night mode

**Settings Menu:**
- ✅ Privacy toggles work
- ✅ Notification toggles work
- ✅ Legal pages open (Terms, Privacy)
- ✅ Help Center opens
- ✅ Contact Support opens

### If All Tests Pass:
🎉 **Migration 100% complete!**

---

## Step 9: What to Do with Netlify (Optional)

### Option A: Keep Both (Recommended)
**Why**: Free backup, no downside
- Netlify: Development/testing environment
- Cloudflare: Production environment
- Cost: $0/month for both

### Option B: Pause Netlify
**How**: Netlify Dashboard → Site settings → Pause site
- Keeps configuration but stops deploys
- Can reactivate anytime

### Option C: Delete Netlify Site
**Warning**: Only if you're 100% sure
- Cannot recover once deleted
- Lose deploy history

**My Recommendation**: Keep both. Netlify can be your staging environment.

---

## Troubleshooting

### Build Fails:
**Error**: "Command not found: npm"
- **Fix**: Cloudflare should auto-detect Node.js. If not, add build environment variable:
  - `NODE_VERSION` = `18`

**Error**: "Module not found"
- **Fix**: Check that all dependencies are in `package.json` (not just `devDependencies`)

### Site Loads but Looks Broken:
**Error**: CSS not loading, blank page
- **Fix**: Check build output directory is `dist` (not `build`)
- **Check**: Visit `https://[your-url].pages.dev` (not just the domain)

### Clerk Authentication Fails:
**Error**: "Invalid publishable key" or "Domain not allowed"
- **Fix**: Add Cloudflare domain to Clerk allowed origins (Step 7)
- **Check**: Environment variable `VITE_CLERK_PUBLISHABLE_KEY` is correct

### Images Not Uploading:
**Error**: Cloudinary errors
- **Fix**: Check environment variables:
  - `VITE_CLOUDINARY_CLOUD_NAME` = `ddkgphfxe`
  - `VITE_CLOUDINARY_UPLOAD_PRESET` = `lightning_uploads_v2`

### Database Queries Fail:
**Error**: Supabase connection errors
- **Fix**: Check environment variables:
  - `VITE_SUPABASE_URL` = `https://wsyhpxnzsuxnylgqvcti.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` = (long JWT token)

---

## Post-Migration Setup

### 1. Update Custom Domain (Optional)
If you have a custom domain (e.g., `lightningapp.com`):

**Actions**:
1. Cloudflare Dashboard → Pages → Your project
2. Click **"Custom domains"**
3. Click **"Set up a custom domain"**
4. Enter your domain
5. Update DNS records (Cloudflare will provide instructions)

### 2. Set Up Sentry (Optional - if not done yet)
**Why**: Error monitoring for production
**Time**: 15 minutes
**See**: `/docs/SENTRY_SETUP.md`

### 3. Enable Analytics (Optional)
**Actions**:
1. Cloudflare Dashboard → Your project
2. Click **"Analytics"** tab
3. Free analytics included:
   - Page views
   - Unique visitors
   - Bandwidth usage
   - Geographic distribution

---

## Rollback Plan (If Needed)

### If Something Goes Wrong:

**Option 1: Fix Cloudflare Deployment**
- Check build logs for errors
- Verify environment variables
- Redeploy from Cloudflare dashboard

**Option 2: Use Netlify as Backup**
- Your Netlify site is still live
- Just use Netlify URL while debugging Cloudflare
- No data loss (everything in Supabase)

**Option 3: Start Over**
- Delete Cloudflare Pages project
- Create new one
- Follow steps again (already know what to do)

---

## Success Metrics

### You'll Know Migration Succeeded When:
- ✅ Cloudflare URL loads your app
- ✅ Sign in works (Clerk)
- ✅ Profile data loads (Supabase)
- ✅ Images upload (Cloudinary)
- ✅ All tabs functional
- ✅ Settings work
- ✅ No console errors

### Immediate Benefits:
- ✅ **Unlimited bandwidth** (never worry about limits again)
- ✅ **Faster load times** (Cloudflare's 200+ CDN locations)
- ✅ **Better security** (enterprise DDoS protection)
- ✅ **$228/year saved** (vs Netlify Pro)
- ✅ **Scales to 100k+ users** (on free tier)

---

## Next Steps After Migration

1. ✅ Test thoroughly (all features)
2. ✅ Update Clerk production keys (when ready for public launch)
3. ✅ Continue building Settings features (7 remaining)
4. ✅ Complete beta testing
5. ✅ Launch to first users

---

## Support & Resources

### Cloudflare Pages Documentation:
- https://developers.cloudflare.com/pages

### If You Get Stuck:
1. Check build logs (detailed error messages)
2. Cloudflare Community: https://community.cloudflare.com
3. Compare with Netlify settings (environment variables, build command)

### Contact Me:
If anything doesn't work as described in this guide, let me know and I'll help troubleshoot!

---

## Summary

**What Changed**: Hosting platform (Netlify → Cloudflare)
**What Didn't Change**: Everything else (code, architecture, services)
**Time Investment**: 30 minutes
**Cost Savings**: $228/year
**Risk**: Very low (can revert anytime)
**Benefit**: Unlimited bandwidth, scales to 100k+ users for free

🚀 **Let's do this!**
