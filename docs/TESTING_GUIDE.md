# Testing Guide for UI/UX Fixes

## Prerequisites
1. Start the development server: `npm run dev`
2. The app should be available at `http://localhost:5173`
3. Make sure you're signed in or can access the sign-in page

## Test Checklist

### ✅ Fix 1: Sign Up Link Visibility
**Location**: `/sign-in` page
**Steps**:
1. Navigate to sign-in page
2. Scroll to bottom of the sign-in form
3. **Expected**: "Sign up" link should be bold, blue, and clearly visible

### ✅ Fix 2: Message Input and User List Overlap
**Location**: Messages tab → Click "+" button
**Steps**:
1. Go to Messages tab
2. Click the "+" floating action button
3. Type in the "To:" field
4. **Expected**: Clear spacing (mb-6) between recipient chips and message input field

### ✅ Fix 3: Message Preview Box Alignment
**Location**: Messages tab → Conversation list
**Steps**:
1. View the conversation list
2. Check message card padding
3. **Expected**: Tighter padding (px-3 py-3), better vertical spacing (space-y-3)

### ✅ Fix 4: Sent Message Timestamp Positioning
**Location**: Messages tab → Open any conversation
**Steps**:
1. Open a conversation
2. Look at message timestamps (e.g., "5h ago", "Just now")
3. **Expected**: Timestamp has proper right padding (pr-1), not cramped to edge

### ✅ Fix 5: Edit Profile Modal Backdrop Blur
**Location**: Settings → Edit Profile
**Steps**:
1. Open Settings menu
2. Click "Edit Profile"
3. **Expected**: Background should be blurred (backdrop-filter: blur(8px)) and non-interactive

### ✅ Fix 6: Help Center Search Clear Icon
**Location**: Settings → Help Center
**Steps**:
1. Open Help Center
2. Type text in the search bar
3. **Expected**: X icon appears on the right side to clear the search text

### ✅ Fix 7: New Message Placeholder Text
**Location**: Messages tab → Click "+" button
**Steps**:
1. Go to Messages tab
2. Click "+" button to create new message
3. Look at "To:" field placeholder
4. **Expected**: Shows "Search by name or username..." instead of "Type a name..."

### ✅ Fix 8: Online/Offline Indicator
**Location**: Messages tab → Open any conversation
**Steps**:
1. Open a conversation
2. Look at the chat header below the user's name
3. **Expected**: Shows "🟢 Online" or "⚫ Offline" status text

### ✅ Fix 9: Change Picture Dedicated Modal
**Location**: Settings → "Change Profile Picture"
**Steps**:
1. Open Settings menu
2. Click "Change Profile Picture"
3. **Expected**: Opens dedicated modal (NOT full Edit Profile dialog)
4. **Expected**: Shows image upload and emoji selector options

### ✅ Fix 10: HTML Entity Decoding
**Location**: Messages tab → Send a message
**Steps**:
1. Open any conversation
2. Send a message with an apostrophe: "what's happening"
3. **Expected**: Message displays as "what's happening" NOT "what&#x27;s happening"

### ✅ Fix 11: Message Filter Settings Validation
**Location**: Messages tab → Try messaging restricted user
**Steps**:
1. Find a user who has "No one can message me" setting
2. Try to send them a message
3. **Expected**: Shows error "This user has disabled messages" before sending

### ✅ Fix 12: Share Testimony Button Effects
**Location**: Profile tab (your own profile with testimony)
**Steps**:
1. Go to your Profile tab
2. Find "Share Testimony" button
3. Hover over the button
4. **Expected**: Button lifts slightly (translateY(-1px)), smooth transition
5. Click the button
6. **Expected**: Button scales down (scale(0.98)) on click, smooth animation

## Automated Testing with Chrome DevTools MCP

Once the server is running, I can use Chrome DevTools MCP to:
- Take screenshots of each fix
- Navigate through the app
- Interact with elements
- Verify visual changes

## Quick Start Command

```bash
npm run dev
```

Then navigate to `http://localhost:5173` in your browser.

