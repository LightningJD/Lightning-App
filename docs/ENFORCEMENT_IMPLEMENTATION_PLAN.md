# Privacy & Feature Enforcement Implementation Plan

**Created:** October 25, 2025
**Status:** IN PROGRESS - Completing all enforcement shortcuts

## Overview

This document tracks the implementation of enforcement logic for privacy settings, blocking, and other features that were built but lack enforcement.

---

## Issue #1: Privacy Settings Enforcement ✅ PARTIAL

### Status: Database RPC Updated, Frontend Integration IN PROGRESS

### Completed:
- ✅ Created `/supabase/migrations/update_nearby_users_privacy.sql`
  - Updated `find_nearby_users` RPC to filter by `is_private` and `notify_nearby`
  - Added `current_user_id` parameter to check friendships
  - Private users only visible to friends
- ✅ Updated `/src/lib/database/users.js` - `findNearbyUsers` passes current user ID
- ✅ Updated `/src/components/NearbyTab.jsx` - passes currentUser and searchRadius
- ✅ Created `/src/lib/database/privacy.js` - Helper functions:
  - `canViewTestimony()`
  - `canSendMessage()`
  - `isUserVisible()`
- ✅ Exported privacy functions from `/src/lib/database/index.js`
- ✅ Started ProfileTab.jsx integration (added canView state, useEffect)

### Remaining Work:
1. **ProfileTab.jsx** - Wrap testimony rendering in conditional:
   ```jsx
   {canView ? (
     // Show full testimony
   ) : (
     <div className="p-6 text-center">
       <p>This testimony is {visibility} - only visible to {audience}</p>
     </div>
   )}
   ```

2. **MessagesTab.jsx** - Check message_privacy before sending:
   ```javascript
   const { allowed, reason } = await canSendMessage(recipientId, senderId);
   if (!allowed) {
     showError(reason); // "This user only accepts messages from friends"
     return;
   }
   ```

3. **Pass currentUserProfile prop** to ProfileTab wherever it's used:
   - App.jsx (multiple instances)
   - Any other components rendering ProfileTab

**Time Estimate:** 1 hour remaining

---

## Issue #2: Blocking Enforcement ⏳ NOT STARTED

### What Needs To Be Done:

1. **NearbyTab.jsx** - Filter blocked users from search results:
   ```javascript
   import { isUserBlocked, isBlockedBy } from '../lib/database';

   // After getting nearby users:
   const filtered = [];
   for (const user of nearbyUsers) {
     const blocked = await isUserBlocked(currentUserId, user.id);
     const blockedBy = await isBlockedBy(currentUserId, user.id);
     if (!blocked && !blockedBy) {
       filtered.push(user);
     }
   }
   ```

2. **MessagesTab.jsx** - Filter conversations and messages:
   - Don't show conversations with blocked users
   - Don't display messages from blocked users
   - Show "This user has blocked you" if trying to message someone who blocked you

3. **ProfileTab.jsx** - Hide blocked users' testimonies:
   - Check if user is blocked before rendering testimony
   - Show placeholder: "You have blocked this user"

4. **GroupsTab.jsx** - Filter blocked users from member lists:
   - Don't show blocked users in group members
   - Prevent adding blocked users to groups

**Time Estimate:** 2-3 hours

---

## Issue #3: Multi-Recipient Chat → Group Creation ⏳ NOT STARTED

### What Needs To Be Done:

**File:** `/src/components/MessagesTab.jsx:923`

Current code:
```javascript
// TODO: Implement actual group creation and navigation to Groups tab
alert(`Creating group chat with ${selectedRecipients.length} people...`);
```

Fix:
```javascript
// Create group with selected recipients
const groupName = `Chat with ${selectedRecipients.map(r => r.displayName || r.username).join(', ')}`;
const memberIds = selectedRecipients.map(r => r.id);

try {
  const newGroup = await createGroup({
    name: groupName,
    description: `Group chat created on ${new Date().toLocaleDateString()}`,
    creatorId: userProfile.supabaseId,
    memberIds: memberIds,
    isPrivate: true // Multi-recipient chats are always private
  });

  showSuccess('Group chat created!');

  // Navigate to Groups tab and open the new group
  onNavigateToGroups(newGroup.id); // Need to add this prop

  // Reset and close dialog
  setSelectedRecipients([]);
  setShowMultiRecipient(false);
} catch (error) {
  console.error('Error creating group:', error);
  showError('Failed to create group chat');
}
```

**Time Estimate:** 1 hour

---

## Issue #4: Report Content Integration ⏳ NOT STARTED

### What Needs To Be Done:

ReportContent component exists but isn't wired to 3-dot menus. Need to add "Report" option to:

1. **ProfileTab.jsx** - Add 3-dot menu to profile header with "Report User" option
2. **TestimonyCard** (if separate component) - Add "Report Testimony" to menu
3. **MessagesTab.jsx** - Add long-press or right-click "Report Message"
4. **GroupsTab.jsx** - Add "Report Group" to group settings menu

Each needs to:
- Import `ReportContent` component
- Add state: `const [showReport, setShowReport] = useState(false)`
- Pass appropriate data: `reportType` and `reportedContent`
- Example:
  ```jsx
  <MenuItem
    label="Report User"
    icon={Flag}
    onClick={() => {
      setReportData({
        type: 'user',
        content: { id: profile.supabaseId, name: profile.displayName }
      });
      setShowReportContent(true);
    }}
  />
  ```

**Time Estimate:** 2-3 hours

---

## Issue #5: Cloudinary Image Deletion 🤔 DECISION NEEDED

### Current Status:
Function exists but is a stub (cloudinary.js:186)

### Options:

**Option A: Implement Server-Side Deletion (2-3 hours)**
- Create serverless function (Netlify/Cloudflare Function)
- Store Cloudinary API secret in environment variables
- Call delete API when user changes profile picture
- Pros: Keeps storage clean, professional
- Cons: Requires server-side code, API secrets management

**Option B: Defer to Phase 2 (RECOMMENDED)**
- Mark as Phase 2 feature
- Document limitation
- Cloudinary free tier = 25 GB storage
- Each profile pic ~100KB = 250,000 images before hitting limit
- Pros: Ship faster, sufficient for beta (50-100 users)
- Cons: Old images accumulate

**Recommendation:** **DEFER TO PHASE 2**
Rationale: 100 users × 5 profile changes each = 500 images = 50 MB. Won't hit limit for years.

---

## Issue #6: Notification Preferences ⏳ PARTIAL

### What Needs To Be Done:

1. **notify_nearby** - ✅ DONE (fixed in RPC function)

2. **notify_messages** - Defer to Phase 2 (when push notifications implemented)
   - Currently no notification system exists
   - This column is ready for future use
   - Mark in roadmap as "Ready for Phase 2"

3. **notify_friend_requests** - Defer to Phase 2
   - Same as above
   - No notification system yet

**Time Estimate:** 0 hours (already done for nearby, rest deferred)

---

## Summary

### Time Required to Fix All Issues:
- Issue #1 (Privacy): 1 hour remaining
- Issue #2 (Blocking): 2-3 hours
- Issue #3 (Multi-Recipient): 1 hour
- Issue #4 (Report Integration): 2-3 hours
- Issue #5 (Cloudinary): 0 hours (defer)
- Issue #6 (Notifications): 0 hours (done/deferred)

**Total Time: 6-8 hours**

### Implementation Order:
1. ✅ Privacy Settings RPC (DONE)
2. ⏳ Privacy Settings Frontend (1 hour) - NEXT
3. ⏳ Blocking Enforcement (2-3 hours)
4. ⏳ Multi-Recipient Chat (1 hour)
5. ⏳ Report Integration (2-3 hours)

---

## Testing Checklist

After all fixes implemented, test:

- [ ] Private profile not visible in Connect tab (except to friends)
- [ ] notify_nearby=false hides user from Connect
- [ ] Testimony with visibility="friends" only visible to friends
- [ ] Testimony with visibility="private" not visible to anyone
- [ ] message_privacy="friends" prevents non-friends from messaging
- [ ] message_privacy="none" prevents all messages
- [ ] Blocked users don't appear in Connect tab
- [ ] Blocked users' messages don't appear in MessagesTab
- [ ] Can't see blocked users' testimonies
- [ ] Multi-recipient chat creates a group
- [ ] Report buttons appear on profiles/testimonies/messages/groups
- [ ] Reports save to database correctly

---

**Next Steps:** Continue with ProfileTab testimony visibility UI, then move to blocking enforcement.
