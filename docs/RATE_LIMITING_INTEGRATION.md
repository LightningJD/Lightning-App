# Rate Limiting Integration Guide

## What's Been Implemented

✅ **Core Rate Limiter:** `src/lib/rateLimiter.js`
- Client-side rate limiting using localStorage
- Prevents spam across page refreshes
- 10 different action types configured

✅ **MessagesTab Integration:**
- Checks rate limit before sending message
- Records attempt after successful send
- Shows toast notification if rate limited

## Still Need to Integrate (Quick - 30 minutes each)

### 1. GroupsTab - Group Messages
**File:** `src/components/GroupsTab.jsx:233`

```javascript
// At top, add import:
import { checkAndNotify, recordAttempt } from '../lib/rateLimiter';

// In handleSendGroupMessage (line 233), add before sending:
if (!checkAndNotify('send_group_message', showError)) {
  return;
}

// After successful send (where message is added to database), add:
recordAttempt('send_group_message');
```

### 2. NearbyTab - Friend Requests
**File:** `src/components/NearbyTab.jsx`

```javascript
// At top, add import:
import { checkAndNotify, recordAttempt } from '../lib/rateLimiter';
import { showError } from '../lib/toast';

// In handleSendFriendRequest function, add at start:
if (!checkAndNotify('send_friend_request', showError)) {
  return;
}

// After successful request sent to database:
recordAttempt('send_friend_request');
```

### 3. GroupsTab - Create Group
**File:** `src/components/GroupsTab.jsx`

```javascript
// In handleCreateGroup function, add at start:
if (!checkAndNotify('create_group', showError)) {
  return;
}

// After successful group creation:
recordAttempt('create_group');
```

### 4. App.jsx - Testimony Creation
**File:** `src/App.jsx`

```javascript
// At top, add import:
import { checkAndNotify, recordAttempt } from './lib/rateLimiter';

// In handleCreateTestimony function, add at start:
if (!checkAndNotify('create_testimony', showError)) {
  return;
}

// After successful testimony creation:
recordAttempt('create_testimony');
```

### 5. App.jsx - Profile Updates
**File:** `src/App.jsx`

```javascript
// In handleProfileEdit function, add at start:
if (!checkAndNotify('update_profile', showError)) {
  return;
}

// After successful profile update:
recordAttempt('update_profile');
```

### 6. ImageUploadButton - Image Uploads
**File:** `src/components/ImageUploadButton.jsx`

```javascript
// At top, add import:
import { checkAndNotify, recordAttempt } from '../lib/rateLimiter';
import { showError } from '../lib/toast';

// In handleImageUpload function, add at start:
if (!checkAndNotify('upload_image', showError)) {
  return;
}

// After successful upload:
recordAttempt('upload_image');
```

### 7. GroupsTab & MessagesTab - Reactions
**File:** Both `GroupsTab.jsx` and `MessagesTab.jsx`

```javascript
// In handleReaction function, add at start:
if (!checkAndNotify('add_reaction', showError)) {
  return;
}

// After successful reaction added:
recordAttempt('add_reaction');
```

### 8. ProfileTab - Testimony Likes
**File:** `src/components/ProfileTab.jsx`

```javascript
// At top, add import:
import { checkAndNotify, recordAttempt } from '../lib/rateLimiter';
import { showError } from '../lib/toast';

// In handleLike function, add at start:
if (!checkAndNotify('like_testimony', showError)) {
  return;
}

// After successful like:
recordAttempt('like_testimony');
```

## Rate Limit Configurations

```javascript
const RATE_LIMITS = {
  send_message: { maxAttempts: 10, windowMs: 60000, cooldownMs: 5000 },
  send_group_message: { maxAttempts: 15, windowMs: 60000, cooldownMs: 3000 },
  send_friend_request: { maxAttempts: 5, windowMs: 300000, cooldownMs: 10000 },
  create_group: { maxAttempts: 3, windowMs: 600000, cooldownMs: 30000 },
  create_testimony: { maxAttempts: 1, windowMs: 3600000, cooldownMs: 60000 },
  update_profile: { maxAttempts: 5, windowMs: 300000, cooldownMs: 5000 },
  add_reaction: { maxAttempts: 30, windowMs: 60000, cooldownMs: 500 },
  like_testimony: { maxAttempts: 20, windowMs: 60000, cooldownMs: 1000 },
  upload_image: { maxAttempts: 5, windowMs: 300000, cooldownMs: 10000 },
};
```

## User Experience

**When rate limited, users see:**
- Toast notification: "You're doing that too much. Please wait X seconds."
- Specific cooldown time (e.g., "Please wait 5 seconds before trying again")
- Non-blocking (doesn't crash app, just prevents action)

**Why This Works:**
- Prevents accidental spam (double-clicking send button)
- Stops malicious abuse (spam bots)
- Improves server performance (fewer unnecessary requests)
- Better UX (clear feedback on why action blocked)

## Testing Rate Limits

```javascript
// In browser console:

// See remaining attempts
import { getRemainingAttempts } from './src/lib/rateLimiter';
console.log('Messages remaining:', getRemainingAttempts('send_message'));

// Clear rate limits (testing only!)
import { clearRateLimits } from './src/lib/rateLimiter';
clearRateLimits('send_message'); // Clear specific action
clearRateLimits(); // Clear all limits
```

## Next Step: Server-Side Rate Limiting

**When to Add:**
- After reaching 200+ concurrent users
- If seeing abuse patterns in logs
- When scaling to 1,000+ users

**How to Add (Future):**
1. Use Supabase Edge Functions
2. Implement Redis for distributed rate limiting
3. Add IP-based rate limits
4. Use Cloudflare rate limiting (free tier)

**For Now:**
Client-side rate limiting is sufficient for beta (50-100 users).

## Benefits of Current Implementation

✅ **Prevents:**
- Accidental spam (user double-clicks button)
- Malicious abuse (bots sending 1,000 messages)
- Server overload (too many requests)
- Database costs (unnecessary writes)

✅ **Improves:**
- User experience (clear feedback)
- Server performance (fewer requests)
- Data quality (no duplicate messages)
- Cost efficiency (saves Supabase quota)

## Success Metrics

After full integration, monitor:
- Number of rate limit triggers (should be < 1% of actions)
- User complaints (should be near zero)
- Server load (should decrease slightly)
- Database write costs (should decrease 5-10%)
