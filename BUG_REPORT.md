# 🐛 Bug Report - Lightning App QA
**Date**: February 8, 2026
**Session**: Comprehensive QA Check

## Critical Bugs Found

### 🔴 BUG #1: Potential Crash in useUserProfile.ts
**File**: `src/components/useUserProfile.ts:54`
**Severity**: HIGH
**Issue**: Array access without bounds checking
```typescript
// Current code:
username: supabase User?.username || user.username || user.emailAddresses[0]?.emailAddress.split('@')[0] || 'user',
```
**Problem**: If `user.emailAddresses` is an empty array, `user.emailAddresses[0]` returns `undefined`, but the optional chaining only protects the `.emailAddress` access, not the array access.
**Fix**: Add proper fallback before array access or check array length first.

---

### 🔴 BUG #2: Potential Crash in users.ts syncUserToSupabase
**File**: `src/lib/database/users.ts:40`
**Severity**: HIGH
**Issue**: Same array access issue as Bug #1
```typescript
username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0],
```
**Problem**: Crashes if `emailAddresses` is empty array.
**Fix**: Check array length or provide fallback.

---

### 🔴 BUG #3: Word Count Calculation Incorrect
**File**: `src/lib/database/testimonies.ts:40`
**Severity**: MEDIUM
**Issue**: Naive word count doesn't handle whitespace properly
```typescript
word_count: testimonyData.content.split(' ').length,
```
**Problem**:
- Doesn't trim leading/trailing spaces
- Counts multiple spaces as words
- Doesn't handle newlines, tabs properly
- Treats "word\n\nword" as one word

**Fix**: Use proper regex-based word counting.

---

### 🟡 BUG #4: Update Profile Can't Clear Fields
**File**: `src/lib/database/users.ts:93-99`
**Severity**: MEDIUM
**Issue**: Falsy checks prevent clearing fields
```typescript
if (profileData.displayName) updates.display_name = profileData.displayName;
if (profileData.username) updates.username = profileData.username;
if (profileData.bio) updates.bio = profileData.bio;
```
**Problem**: If user wants to clear bio to empty string, the update won't happen because empty string is falsy.
**Fix**: Check for `!== undefined` instead of truthy check.

---

### 🟡 BUG #5: Type Safety Issues with 'any'
**File**: Multiple files
**Severity**: LOW-MEDIUM
**Issue**: Extensive use of `any` type masks potential runtime errors
- `useUserProfile.ts:10` - `useState<any>(null)`
- `testimonies.ts:107` - `(testimony as any).user_id`
- `users.ts:38` - `const userData: any = {`

**Problem**: Type safety is compromised, making it harder to catch errors at compile time.
**Fix**: Define proper TypeScript interfaces.

---

### 🟡 BUG #6: Missing Null Check in App.tsx
**File**: `src/App.tsx:609-614`
**Severity**: LOW
**Issue**: Testimony editing without proper validation
```typescript
if (profileData.testimonyContent && userProfile.story?.id && userProfile.supabaseId) {
  await updateTestimony(userProfile.story.id, userProfile.supabaseId, {
    content: profileData.testimonyContent,
    lesson: profileData.testimonyLesson
  });
}
```
**Problem**: No error handling if `updateTestimony` fails. Silent failure.
**Fix**: Add try-catch and user feedback.

---

### 🟡 BUG #7: Race Condition in Auto-Save Testimony
**File**: `src/App.tsx:319-380`
**Severity**: LOW-MEDIUM
**Issue**: Component cleanup not properly handled
```typescript
let isMounted = true;
```
**Problem**: Multiple rapid auth state changes could cause multiple auto-save attempts. Also uses `setTimeout` with `window.location.reload()` which could execute after unmount.
**Fix**: Add more robust cleanup and debouncing.

---

### 🟡 BUG #8: Testimony Query Inconsistency
**File**: `src/lib/database/testimonies.ts:76-77`
**Severity**: LOW
**Issue**: Using `.single()` but handling multiple rows case
```typescript
.limit(1)
.single();
```
**Problem**: If user somehow has multiple testimonies, `.single()` will error even with `.limit(1)`. The PGRST116 error handling only covers "no rows", not "multiple rows".
**Fix**: Remove `.single()` and just take first result from array, OR enforce one-testimony-per-user at database level with unique constraint.

---

### 🟡 BUG #9: Search Radius Validation Not Enforced
**File**: `src/App.tsx:150-154`
**Severity**: LOW
**Issue**: Validation only on blur, can be bypassed
```typescript
if (searchRadius < 5 || searchRadius > 100) {
  showError('Search radius must be between 5 and 100 miles');
  setSearchRadius(userProfile.searchRadius || 25);
  return;
}
```
**Problem**: User can set value to 0 or empty, and it's stored in state. Only validated when saving. Backend should also validate.
**Fix**: Add HTML input constraints AND backend validation.

---

### 🔵 BUG #10: Missing Loading States
**File**: `src/App.tsx` (multiple locations)
**Severity**: LOW
**Issue**: Several async operations don't show loading states
- Profile edit (line 592)
- Testimony edit (line 643)
- Privacy settings (line 107)

**Problem**: User gets no feedback during database operations. Feels unresponsive.
**Fix**: Add loading states with toast notifications (already partially implemented but inconsistent).

---

## Edge Cases Discovered

### 🔷 EDGE CASE #1: Empty Email Addresses Array
**Scenario**: Clerk user has no email addresses (shouldn't happen, but no validation)
**Files Affected**: `useUserProfile.ts`, `users.ts`
**Impact**: App crashes on signup

### 🔷 EDGE CASE #2: Very Long Testimony Content
**Scenario**: User generates testimony with 10,000+ words
**Impact**:
- Word count calculation slow
- UI might not scroll properly
- Database column might have length limit

### 🔷 EDGE CASE #3: Special Characters in Username
**Scenario**: Email like `user+test@example.com` creates username `user+test`
**Impact**: Username with special characters might break UI or routing

### 🔷 EDGE CASE #4: Rapid Theme Switching
**Scenario**: User rapidly toggles night mode
**Impact**: LocalStorage writes might race, tracking might count incorrectly

### 🔷 EDGE CASE #5: Network Failure During Testimony Generation
**Scenario**: API call to `/api/generate-testimony` fails
**Impact**: Already handled with fallback (lines 446-474), but error message could be better

---

## Recommendations

### Immediate Fixes Required
1. ✅ Fix array access bugs (#1, #2) - CRITICAL
2. ✅ Fix word count calculation (#3)
3. ✅ Fix profile update falsy checks (#4)

### Nice to Have
4. Add proper TypeScript types (#5)
5. Add error handling for testimony updates (#6)
6. Add unique constraint for one-testimony-per-user (#8)
7. Add backend validation for search radius (#9)
8. Add consistent loading states (#10)

### Testing Recommendations
- Add E2E test for signup with edge case emails
- Add unit test for word count function
- Add test for clearing profile fields
- Add test for rapid state changes (race conditions)

---

## Summary
- **Critical Bugs**: 2
- **Medium Bugs**: 3
- **Low Bugs**: 5
- **Edge Cases**: 5

**Overall Assessment**: App is production-ready with minor issues. Critical bugs should be fixed before next deploy.
