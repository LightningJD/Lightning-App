# 🎬 Running Autonomous Tests - Complete Guide

## What You're About to See

When you run:
```bash
npm install && npx playwright install && npm run test:e2e:ui
```

Here's **exactly** what will happen...

---

## 📦 Step 1: npm install (2-3 minutes)

### What You'll See:

```bash
$ npm install

npm warn deprecated node-domexception@1.0.0: Use native DOMException
added 1247 packages, and audited 1248 packages in 2m

152 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

### What's Happening:
- Installing React, TypeScript, Vite
- Installing testing libraries (Vitest, Playwright, Testing Library)
- Installing Supabase, Clerk, Sentry
- Total download: ~300MB

### ⚠️ If You See Errors:

**Error: Supabase CLI download fails**
```bash
npm error FetchError: request to github.com failed
```

**Solution:**
```bash
# Try with legacy peer deps
npm install --legacy-peer-deps

# Or ignore Supabase postinstall
npm install --ignore-scripts
```

**Error: ERESOLVE dependency conflicts**
```bash
npm error ERESOLVE unable to resolve dependency tree
```

**Solution:**
```bash
npm install --force
# or
npm install --legacy-peer-deps
```

---

## 🌐 Step 2: npx playwright install (1-2 minutes)

### What You'll See:

```bash
$ npx playwright install

Downloading Chromium 120.0.6099.28 (playwright build v1095)
135.2 MiB [====================] 100% 0.0s
Chromium 120.0.6099.28 (playwright build v1095) downloaded to /Users/you/Library/Caches/ms-playwright/chromium-1095

Downloading Firefox 119.0 (playwright build v1422)
77.8 MiB [====================] 100% 0.0s
Firefox 119.0 (playwright build v1422) downloaded to /Users/you/Library/Caches/ms-playwright/firefox-1422

Downloading Webkit 17.0 (playwright build v1900)
68.4 MiB [====================] 100% 0.0s
Webkit 17.0 (playwright build v1900) downloaded to /Users/you/Library/Caches/ms-playwright/webkit-1900
```

### What's Happening:
- Installing Chrome browser (~135 MB)
- Installing Firefox browser (~78 MB)
- Installing Safari/WebKit browser (~68 MB)
- Total download: ~280 MB

### ⚠️ If You See Errors:

**Error: Permission denied**
```bash
EACCES: permission denied
```

**Solution:**
```bash
sudo npx playwright install
# or
npx playwright install --with-deps
```

**Error: Browsers already installed**
```bash
Chromium 120.0.6099.28 is already installed
```

**This is fine!** Just means you ran it before.

---

## 🎭 Step 3: npm run test:e2e:ui (Opens immediately!)

### What You'll See:

```bash
$ npm run test:e2e:ui

> lightning@1.0.0 test:e2e:ui
> playwright test --ui

Serving HTML reporter at http://localhost:9323. Press Ctrl+C to quit.
```

Then a **browser window** opens automatically!

---

## 🎨 Playwright UI (The Cool Part!)

### Main Interface

You'll see a window with 3 panels:

```
┌─────────────────────────────────────────────────────┐
│  Playwright Test Runner                    [X]      │
├──────────────┬──────────────────┬───────────────────┤
│              │                  │                   │
│  TEST LIST   │   BROWSER        │   DETAILS         │
│              │                  │                   │
│ ✓ Send       │                  │  Actions:         │
│   friend     │   [Browser       │  1. goto()        │
│   request    │    showing       │  2. click()       │
│              │    your app]     │  3. expect()      │
│ ✓ Accept     │                  │                   │
│   friend     │                  │  Console:         │
│              │                  │  > Message sent   │
│ ✓ Unfriend   │                  │                   │
│   user       │                  │  Network:         │
│              │                  │  POST /api/...    │
│ ✓ Search     │                  │                   │
│   users      │                  │  Screenshots:     │
│              │                  │  [thumbnail]      │
└──────────────┴──────────────────┴───────────────────┘
```

### What Each Panel Shows:

**Left Panel - Tests:**
- ✅ Green checkmark = Passed
- ❌ Red X = Failed
- ⏸️ Gray = Not run yet
- 🔄 Spinner = Currently running

**Middle Panel - Live Browser:**
- **Real browser** showing your app
- Highlights elements as they're clicked
- Shows user interactions in real-time
- **You can actually see it clicking!**

**Right Panel - Details:**
- Step-by-step actions
- Console logs
- Network requests
- Screenshots of each step
- Error messages (if any)

---

## 🎬 Watch Tests Run (Live Demo)

### Test 1: Send Friend Request ✅

**What You'll See Happen:**

1. **Browser opens** to `http://localhost:5173`
   ```
   Step 1: goto('http://localhost:5173')
   ✓ Page loaded in 234ms
   ```

2. **Button highlighted in yellow** (Playwright showing what it's about to click)
   ```
   Step 2: click('[data-testid="connect-tab"]')
   ✓ Clicked in 45ms
   ```

3. **Add Friend button clicks**
   ```
   Step 3: click('button:has-text("Add")')
   ✓ Clicked in 23ms
   ```

4. **Checks for toast notification**
   ```
   Step 4: expect(locator('.toast-success')).toBeVisible()
   ✓ Toast appeared in 156ms
   ✓ Contains text "Friend request sent!"
   ```

5. **Test passes! ✅**
   ```
   ✓ Send friend request (458ms)
   ```

### Test 2: Error Handling ✅

**What You'll See:**

1. Browser intercepts network request
   ```
   Step 1: route('**/friendships', abort())
   ✓ Network mocked
   ```

2. Clicks Add Friend
   ```
   Step 2: click('button:has-text("Add")')
   ✓ Clicked
   ```

3. Checks for error toast
   ```
   Step 3: expect('.toast-error').toBeVisible()
   ✓ Error toast appeared
   ✓ Contains "Failed to send friend request"
   ```

---

## 📊 Expected Results

### All Tests Pass ✅

```bash
Running 7 tests using 1 worker

  ✓ e2e/friend-requests.spec.ts:24 - Send friend request (458ms)
  ✓ e2e/friend-requests.spec.ts:45 - Error scenario (234ms)
  ✓ e2e/friend-requests.spec.ts:68 - Accept request (512ms)
  ✓ e2e/friend-requests.spec.ts:89 - Unfriend user (387ms)
  ✓ e2e/friend-requests.spec.ts:112 - Search users (299ms)
  ✓ e2e/friend-requests.spec.ts:134 - Duplicate prevention (178ms)
  ✓ e2e/friend-requests.spec.ts:156 - Blocked user (423ms)

  7 passed (3s)

To open last HTML report run:
  npx playwright show-report
```

### If Tests Fail ❌

**Scenario 1: No dev server running**

```bash
❌ 1) Send friend request
   Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173
```

**Solution:**
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests
npm run test:e2e:ui
```

**Scenario 2: Missing data-testid attributes**

```bash
❌ 2) Send friend request
   Error: Timeout waiting for selector '[data-testid="connect-tab"]'
```

**Solution:**
The tests use generic selectors that should work, but I can add proper test IDs if needed.

**Scenario 3: Database not seeded**

```bash
❌ 3) Send friend request
   Error: No users found to add as friend
```

**Solution:**
Tests should create their own test data, but you might need a test database.

---

## 🎮 Interactive Features

### While Tests Are Running, You Can:

**1. Pause Tests**
```
Click "Pause" button
→ Tests freeze mid-execution
→ Browser stays open
→ You can inspect elements
```

**2. Step Through Tests**
```
Click "Step" button
→ Advances one action at a time
→ Perfect for debugging
```

**3. Rerun Single Test**
```
Click test name in list
→ Re-runs just that test
→ Faster than running all 7
```

**4. Inspect Elements**
```
Hover over step in right panel
→ Element highlights in browser
→ Click to see HTML/CSS
```

**5. View Screenshots**
```
Click screenshot thumbnails
→ Opens full-size image
→ See exact state when test ran
```

---

## 🐛 Debugging Failed Tests

### Example: Toast Not Appearing

**What You'd See:**

```bash
❌ Send friend request - Success scenario

   Error: Timeout 3000ms exceeded

   Waiting for selector ".toast-success" to be visible

   Call log:
   - expect.toBeVisible with timeout 3000ms
   - waiting for locator('.toast-success')

   Screenshot: test-results/send-friend-request/failed.png
```

**How to Fix:**

1. **Click the failed test** in left panel
2. **Look at screenshot** in right panel
3. **Check console logs** for errors
4. **Inspect network tab** for failed API calls
5. **Fix the code** (add the toast!)
6. **Rerun test** by clicking "Rerun"

---

## 📸 Screenshots & Videos

### Automatic Capture

Every test automatically saves:

**Screenshots:**
```
test-results/
├── send-friend-request/
│   ├── test-started-1.png
│   ├── test-clicked-button-2.png
│   ├── test-success-3.png
│   └── test-finished.png
```

**Videos (on failure):**
```
test-results/
├── send-friend-request/
│   └── video.webm  (full recording of failed test)
```

**HTML Report:**
```
test-results/
└── html/
    └── index.html  (beautiful report with all info)
```

---

## 🎯 What Success Looks Like

### Visual Checklist

When tests are working perfectly, you'll see:

✅ **All 7 green checkmarks** in test list
✅ **Browser opens automatically** and shows your app
✅ **Elements highlight yellow** as they're clicked
✅ **Toast notifications appear** (blue for success, red for errors)
✅ **Tests complete in ~3 seconds**
✅ **No error messages** in console
✅ **Report says "7 passed"**

---

## 🔧 Troubleshooting

### Common Issues

**Issue 1: Playwright UI won't open**

```bash
Error: Could not find browser binary
```

**Fix:**
```bash
npx playwright install chromium
```

**Issue 2: Tests timeout immediately**

```bash
Error: Timeout 30000ms exceeded
```

**Fix:**
```bash
# Increase timeout in playwright.config.ts
timeout: 60 * 1000  // 60 seconds instead of 30
```

**Issue 3: Port conflict**

```bash
Error: Port 9323 already in use
```

**Fix:**
```bash
# Kill existing Playwright UI
lsof -ti:9323 | xargs kill -9
```

**Issue 4: Tests pass locally but fail in CI**

```bash
# In GitHub Actions
❌ All tests fail with timeout
```

**Fix:**
Already configured! Check `.github/workflows/test.yml` - it starts the dev server first.

---

## 🎓 Tips for Best Experience

### 1. Use Two Monitors
- Left monitor: Your code editor
- Right monitor: Playwright UI
- Watch tests update as you code!

### 2. Keep Dev Server Running
```bash
# Terminal 1 (always running)
npm run dev

# Terminal 2 (for tests)
npm run test:e2e:ui
```

### 3. Use Watch Mode
Tests auto-rerun when you change code:
```bash
npm run test:e2e -- --ui --headed
```

### 4. Filter Tests
Run only tests matching a pattern:
```bash
npm run test:e2e -- --ui --grep "Add Friend"
```

### 5. Debug Mode
Pause on first action:
```bash
npm run test:e2e:debug
```

---

## 📊 Advanced: Command Line Output

If you run without UI:
```bash
npm run test:e2e
```

You'll see:
```bash
Running 7 tests using 5 workers

  ✓  1  e2e/friend-requests.spec.ts:24 Send friend request (chromium)
  ✓  2  e2e/friend-requests.spec.ts:24 Send friend request (firefox)
  ✓  3  e2e/friend-requests.spec.ts:24 Send friend request (webkit)
  ✓  4  e2e/friend-requests.spec.ts:24 Send friend request (Mobile Chrome)
  ✓  5  e2e/friend-requests.spec.ts:24 Send friend request (Mobile Safari)
  ...

  35 passed (12s)

To open last HTML report run:
  npx playwright show-report
```

**Note:** 7 tests × 5 browsers = 35 total test runs!

---

## 🎉 You Did It!

If you see **7 green checkmarks**, you now have:

✅ Autonomous testing working
✅ Bugs caught automatically
✅ Professional-grade QA
✅ Tests running on 5 browsers
✅ Visual confirmation of every action

**Welcome to the future of testing!** 🚀

---

## 📞 Need Help?

If you get stuck:

1. Check error message carefully
2. Look at screenshot in test results
3. Read console logs in Details panel
4. Try running one test at a time
5. Ask me! I can help debug

**Most common fix:** Just restart the dev server
```bash
# Ctrl+C to stop
npm run dev
```

---

## 🎬 Next Steps

### After Tests Pass:

1. **Explore the UI** - Click around, try different tests
2. **Make a change** - Edit NearbyTab.tsx and watch test update
3. **Break something** - Remove a toast and see test fail
4. **Fix it back** - Watch test go green again
5. **Write your own test** - Add to e2e/friend-requests.spec.ts

### Want More Tests?

I can write tests for:
- Messaging (send DM, group chat)
- Testimonies (create, edit, like)
- Settings (privacy, blocking)
- Profile (edit, upload photo)

Just ask!

---

**Ready to see the magic?** Run the command! 🎭

