import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Autonomous Testing
 *
 * This enables AI to test the app like a real user:
 * - Opens browsers
 * - Clicks buttons
 * - Fills forms
 * - Takes screenshots
 * - Detects bugs
 * - Generates reports
 */

export default defineConfig({
  testDir: './e2e',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Run tests in parallel for speed
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'], // Console output
  ],

  use: {
    // Base URL for tests
    baseURL: 'http://localhost:5173',

    // Collect trace when retrying failed tests
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Timeout for each action (click, fill, etc)
    actionTimeout: 10 * 1000,

    // Network timeout
    navigationTimeout: 30 * 1000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Test against mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

/**
 * HOW THIS ENABLES AUTONOMOUS TESTING:
 *
 * 1. Starts the app automatically (npm run dev)
 * 2. Opens 5 different browsers/devices
 * 3. Runs all tests in parallel
 * 4. Takes screenshots of failures
 * 5. Records videos of failures
 * 6. Generates HTML report with all results
 * 7. Exports JSON for AI analysis
 *
 * COMMAND: npm run test:e2e
 * RESULT: Complete bug report without human intervention
 */
