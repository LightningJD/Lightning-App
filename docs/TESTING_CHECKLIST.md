# Complete App Testing Checklist

This checklist ensures EVERY feature in the app is tested. The developer must check off each item and provide screenshots/evidence of testing.

## Authentication & Onboarding
- [ ] Sign up with email
- [ ] Sign in with existing account
- [ ] Sign out
- [ ] Profile creation wizard (all steps)
- [ ] Guest mode access

## Profile Features
- [ ] Edit profile (display name, bio, location)
- [ ] Upload avatar image
- [ ] Choose avatar emoji
- [ ] Link YouTube song (plays automatically)
- [ ] Set music start time
- [ ] View own profile
- [ ] Profile visibility toggle (public/private)

## Settings
- [ ] Search radius slider (5-100 miles)
- [ ] Privacy settings (testimony visibility, message privacy)
- [ ] Notification settings (messages, friend requests, nearby)
- [ ] YouTube channel link
- [ ] Account settings saved correctly

## Testimonies
- [ ] Create new testimony
- [ ] Edit own testimony
- [ ] Delete testimony
- [ ] View testimonies (own and others)
- [ ] Like testimony
- [ ] Unlike testimony
- [ ] View like count
- [ ] View testimony count
- [ ] Testimony visibility respects privacy settings

## Friend System
- [ ] Send friend request
- [ ] Accept friend request
- [ ] Decline friend request
- [ ] View pending friend requests (received)
- [ ] View sent friend requests
- [ ] View friends list
- [ ] Unfriend a user
- [ ] View mutual friends count
- [ ] Friend count displays correctly
- [ ] Cannot send duplicate requests
- [ ] Cannot friend yourself
- [ ] Cannot friend blocked users

## Messages
- [ ] Send message to friend
- [ ] Receive message
- [ ] View conversation history
- [ ] Messages sorted by date
- [ ] Unread message indicator
- [ ] Message privacy settings work
- [ ] Cannot message blocked users
- [ ] Cannot message non-friends (if privacy set)

## Nearby Users
- [ ] View nearby users based on location
- [ ] Search radius affects nearby results
- [ ] Location updates when changed
- [ ] Distance calculation accurate
- [ ] Nearby users respect privacy settings

## Groups
- [ ] Create new group
- [ ] Join group
- [ ] Leave group
- [ ] Send group message
- [ ] View group members
- [ ] Group leader permissions
- [ ] Delete group (leader only)
- [ ] Remove member (leader only)

## Blocking & Reporting
- [ ] Block user
- [ ] Unblock user
- [ ] View blocked users list
- [ ] Blocked users cannot message
- [ ] Blocked users cannot friend request
- [ ] Report user
- [ ] Report testimony
- [ ] Report message
- [ ] Report group

## Search & Discovery
- [ ] Search users by username
- [ ] Search users by display name
- [ ] View other user profiles
- [ ] Profile privacy respected in search

## UI/UX Features
- [ ] Night mode toggle
- [ ] Day mode display
- [ ] Responsive mobile layout
- [ ] Responsive desktop layout
- [ ] Navigation between tabs
- [ ] Scroll behavior (no white gaps)
- [ ] Loading states
- [ ] Error messages display

## Music Player
- [ ] YouTube music autoplays (muted)
- [ ] Music player controls work
- [ ] External link opens YouTube
- [ ] Music start time works
- [ ] Player displays on own profile
- [ ] Player displays on other profiles

## Guest Features
- [ ] Guest can create testimony
- [ ] Guest testimony saved to localStorage
- [ ] Guest modal appears appropriately
- [ ] Guest can convert to account
- [ ] Guest data persists

## Data Validation
- [ ] Username validation (no special chars, length)
- [ ] Email validation
- [ ] Bio length limit (500 chars)
- [ ] Display name length limit (50 chars)
- [ ] Message length limit (1000 chars)
- [ ] Testimony length limit (5000 chars)
- [ ] File upload size limit (5MB)
- [ ] Image file types only (jpg, png, gif)

## Security
- [ ] XSS protection (HTML in testimonies)
- [ ] XSS protection (HTML in bios)
- [ ] XSS protection (HTML in messages)
- [ ] SQL injection prevention
- [ ] No sensitive data in console logs
- [ ] Authorization checks (can't edit other's testimonies)
- [ ] Authorization checks (can't delete other's content)

## Performance
- [ ] App loads in under 3 seconds
- [ ] Images load properly
- [ ] No console errors on load
- [ ] No memory leaks (test with long session)
- [ ] Smooth scrolling

## Edge Cases
- [ ] Very long username handling
- [ ] Very long bio handling
- [ ] Empty states (no friends, no testimonies, etc.)
- [ ] Deleted user handling (null profiles)
- [ ] Network error handling
- [ ] Database error handling
- [ ] Invalid URL handling

## Browser Compatibility
- [ ] Works in Chrome
- [ ] Works in Safari
- [ ] Works in Firefox
- [ ] Works in Edge
- [ ] Works on iOS Safari
- [ ] Works on Android Chrome

## Total Features to Test: 100+

---

## Developer Instructions

1. **Test EVERY checkbox** - Check them off as you test
2. **Document bugs** - For each bug found, note:
   - Feature name
   - What's broken
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshot/video if applicable
3. **Submit report** - Provide completed checklist + bug list for Milestone 1

**Payment only releases when checklist is FULLY completed with evidence.**
