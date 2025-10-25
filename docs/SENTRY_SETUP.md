# Sentry Error Monitoring Setup Guide

## What is Sentry?

Sentry is an error monitoring service that captures crashes, errors, and performance issues in production. It's **essential** for knowing when your app breaks before users complain.

**Why You Need It:**
- 🚨 Get instant alerts when errors happen in production
- 📊 See which errors affect the most users
- 🔍 View stack traces and user actions leading to crashes
- 📈 Track error trends over time
- 🎥 Session replay shows exactly what user did before crash

---

## Setup Instructions (15 minutes)

### Step 1: Create Free Sentry Account

1. Go to https://sentry.io
2. Click "Get Started" → Sign up with GitHub
3. Select plan: **Developer (Free)**
   - 5,000 errors/month free
   - 100 replays/month free
   - Perfect for beta launch

### Step 2: Create Project

1. In Sentry dashboard, click "Create Project"
2. **Platform:** Select "React"
3. **Alert frequency:** Set to "On every new issue"
4. **Project name:** `Lightning`
5. Click "Create Project"

### Step 3: Copy Your DSN

1. After project creation, you'll see a setup page
2. Look for: `Sentry.init({ dsn: "https://..." })`
3. **Copy the DSN** (looks like: `https://abc123@o123456.ingest.sentry.io/789012`)

### Step 4: Add DSN to Environment Variables

1. Open `/Users/jordyndoanne/lightning/.env.local`
2. Add this line:
   ```
   VITE_SENTRY_DSN=paste_your_dsn_here
   ```
3. Save the file

### Step 5: Add to Netlify (for production)

1. Go to Netlify dashboard → Your site → Site settings
2. Click "Environment variables"
3. Click "Add a variable"
   - **Key:** `VITE_SENTRY_DSN`
   - **Value:** Paste your DSN
4. Click "Save"
5. Trigger a new deploy (or it will use it on next deploy)

### Step 6: Restart Dev Server

```bash
# Stop current dev server (Ctrl+C)
npm run dev
```

You should see in console:
```
✅ Sentry error monitoring initialized
```

---

## Testing Sentry (Verify It Works)

### Test in Development:

1. Open browser console
2. You should see: `🐛 Sentry would send error in production: ...`
3. This means Sentry is configured correctly but NOT sending errors in dev mode

### Test in Production:

1. Deploy to Netlify
2. Open production site: https://lightningtech.netlify.app
3. Deliberately cause an error (e.g., click a broken button)
4. Go to Sentry dashboard
5. Within 1-2 minutes, you should see the error appear

---

## How to Use Sentry

### Automatic Error Capture:

Sentry automatically captures:
- Unhandled JavaScript errors
- Promise rejections
- React component errors
- Network failures (optional)

### Manual Error Capture:

```javascript
import { captureError, captureMessage } from './lib/sentry';

try {
  // Some risky operation
  await deleteAllUsers();
} catch (error) {
  captureError(error, {
    context: 'User tried to delete all users',
    userId: user.id,
  });
}

// Or just log a message
captureMessage('User clicked the secret button!', 'info');
```

### View Errors in Dashboard:

1. Go to https://sentry.io
2. Click your "Lightning" project
3. See list of errors, sorted by frequency
4. Click an error to see:
   - Stack trace
   - User info
   - Breadcrumbs (user actions before crash)
   - Session replay (if available)

---

## Sentry Best Practices

### 1. Set Up Alerts

- Go to **Alerts** → Create new alert
- Alert when: "A new issue is created"
- Send to: Your email
- Now you'll know immediately when errors happen!

### 2. Enable Session Replay

- Session replay is already configured
- When an error occurs, Sentry records the 30 seconds before
- You can watch exactly what the user did
- **Privacy:** We mask all text and block media (see `sentry.js`)

### 3. Filter Noise

The `beforeSend` function in `sentry.js` filters out:
- Network errors (user's internet issue)
- Ad blocker errors (not your fault)
- Development errors (only sends in production)

### 4. Monitor Performance

Sentry also tracks:
- Page load times
- API response times
- Slow database queries

Check the **Performance** tab in Sentry dashboard.

---

## What Errors to Watch For

### Critical (Fix Immediately):
- White screen crashes
- Database connection failures
- Authentication errors
- Payment processing failures

### High Priority (Fix Within 24 Hours):
- Features not working (messages not sending)
- Data corruption
- Memory leaks

### Medium Priority (Fix Within Week):
- UI glitches
- Slow performance
- Edge case bugs

### Low Priority (Backlog):
- Minor visual issues
- Rare edge cases
- Non-critical features

---

## Sentry Pricing

**Developer Plan (FREE):**
- 5,000 errors/month
- 100 session replays/month
- 30-day data retention
- **Perfect for beta (50-100 users)**

**Team Plan ($26/month):**
- 50,000 errors/month
- 500 session replays/month
- 90-day data retention
- **Upgrade when you hit 200+ users**

**Business Plan ($80/month):**
- Unlimited errors
- 1,000 session replays/month
- Unlimited data retention
- **Only needed at 1,000+ users**

---

## Troubleshooting

### "Sentry DSN not found" Warning:

1. Check `.env.local` has `VITE_SENTRY_DSN=...`
2. Restart dev server
3. Make sure no typos in variable name

### Errors Not Appearing in Dashboard:

1. Check you're in production (not dev mode)
2. Verify DSN is correct
3. Check Sentry project is active
4. Wait 2-3 minutes (can be delayed)

### Too Many Errors:

1. Go to Sentry dashboard
2. Click issue → "Resolve" or "Ignore"
3. Add filter in `beforeSend` function in `sentry.js`

---

## Success Checklist

- [  ] Sentry account created
- [  ] Project "Lightning" created
- [  ] DSN copied and added to `.env.local`
- [  ] DSN added to Netlify environment variables
- [  ] Dev server restarted
- [  ] Console shows "✅ Sentry error monitoring initialized"
- [  ] Test error sent to dashboard (production only)
- [  ] Email alerts configured

---

## Next Steps After Setup

1. **Monitor Dashboard Daily:**
   - Check for new errors
   - Fix critical issues first
   - Track error trends

2. **Create Error Playbook:**
   - Document common errors
   - Write fixes for each
   - Train team on responses

3. **Set Up Uptime Monitoring:**
   - Consider adding UptimeRobot (free)
   - Get alerts if site goes down
   - Complements Sentry nicely

---

## Support

- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Sentry Discord:** https://discord.gg/sentry
- **Support Email:** support@sentry.io

**Your app now has production-grade error monitoring! 🎉**
