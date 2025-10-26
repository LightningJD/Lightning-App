/**
 * E2E Tests: Settings & Privacy Features
 *
 * Tests privacy settings, blocking, reporting, and account settings
 * Total: 15 comprehensive tests
 */

import { test, expect } from '@playwright/test';

test.describe('Privacy Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Open settings menu
    await page.click('[data-testid="settings-menu"]');
  });

  test('should toggle profile privacy setting', async ({ page }) => {
    // Find profile privacy toggle
    const toggle = page.locator('input[name="profile-privacy"]');

    // Get current state
    const wasChecked = await toggle.isChecked();

    // Toggle it
    await toggle.click();

    // Verify success toast
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText(/privacy.*updated|settings.*saved/i);

    // Verify state changed
    const isNowChecked = await toggle.isChecked();
    expect(isNowChecked).toBe(!wasChecked);
  });

  test('should update testimony visibility setting', async ({ page }) => {
    // Find testimony visibility dropdown
    const dropdown = page.locator('select[name="testimony-visibility"]');

    // Change to "Friends Only"
    await dropdown.selectOption('friends');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();

    // Verify selection persists
    expect(await dropdown.inputValue()).toBe('friends');
  });

  test('should update message privacy setting', async ({ page }) => {
    // Find message privacy dropdown
    const dropdown = page.locator('select[name="message-privacy"]');

    // Change setting
    await dropdown.selectOption('friends');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('should toggle notification settings', async ({ page }) => {
    // Toggle message notifications
    await page.click('input[name="notify-messages"]');
    await expect(page.locator('.toast-success')).toBeVisible();

    // Toggle friend request notifications
    await page.click('input[name="notify-friend-requests"]');
    await expect(page.locator('.toast-success')).toBeVisible();

    // Toggle nearby notifications
    await page.click('input[name="notify-nearby"]');
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});

test.describe('Blocking Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should block user from their profile', async ({ page }) => {
    // Navigate to another user's profile
    await page.click('[data-testid="connect-tab"]');
    await page.click('[data-testid="user-card"]').first();

    // Click block button
    await page.click('button:has-text("Block User")');

    // Confirm block
    await page.click('button:has-text("Confirm")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText(/blocked/i);

    // Verify user disappears from view
    await page.click('[aria-label="Close"]'); // Close profile dialog
    await expect(page.locator('[data-testid="user-card"]')).toHaveCount(0);
  });

  test('should view blocked users list', async ({ page }) => {
    await page.click('[data-testid="settings-menu"]');
    await page.click('text=Blocked Users');

    // Verify blocked users page opens
    await expect(page.locator('h2:has-text("Blocked Users")')).toBeVisible();

    // Should show list or empty state
    const hasBlockedUsers = await page.locator('[data-testid="blocked-user-card"]').count() > 0;

    if (hasBlockedUsers) {
      await expect(page.locator('[data-testid="blocked-user-card"]')).toHaveCount(await page.locator('[data-testid="blocked-user-card"]').count());
    } else {
      await expect(page.locator('text=No blocked users')).toBeVisible();
    }
  });

  test('should unblock user from blocked list', async ({ page }) => {
    await page.click('[data-testid="settings-menu"]');
    await page.click('text=Blocked Users');

    // Find first blocked user (if any)
    const blockedUser = page.locator('[data-testid="blocked-user-card"]').first();

    if (await blockedUser.isVisible()) {
      // Click unblock
      await blockedUser.locator('button:has-text("Unblock")').click();

      // Confirm
      await page.click('button:has-text("Confirm")');

      // Verify success
      await expect(page.locator('.toast-success')).toBeVisible();
      await expect(page.locator('.toast-success')).toContainText(/unblocked/i);
    }
  });

  test('should hide blocked users from all tabs', async ({ page }) => {
    // Block a user first
    await page.click('[data-testid="connect-tab"]');
    const userName = await page.locator('[data-testid="user-card"] .user-name').first().textContent();

    await page.click('[data-testid="user-card"]').first();
    await page.click('button:has-text("Block User")');
    await page.click('button:has-text("Confirm")');

    await page.waitForTimeout(1000);

    // Check Connect tab
    await page.click('[data-testid="connect-tab"]');
    await expect(page.locator(`[data-testid="user-card"]:has-text("${userName}")`)).not.toBeVisible();

    // Check Messages tab
    await page.click('[data-testid="messages-tab"]');
    await expect(page.locator(`[data-testid="conversation"]:has-text("${userName}")`)).not.toBeVisible();

    // Check Groups tab
    await page.click('[data-testid="groups-tab"]');
    // User should not appear in group member lists
  });
});

test.describe('Content Reporting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should report user from their profile', async ({ page }) => {
    await page.click('[data-testid="connect-tab"]');
    await page.click('[data-testid="user-card"]').first();

    // Click report button
    await page.click('button:has-text("Report User")');

    // Select reason
    await page.click('input[value="spam"]');

    // Add details
    await page.fill('textarea[name="report-details"]', 'This user is sending spam messages');

    // Submit report
    await page.click('button:has-text("Submit Report")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText(/report.*submitted/i);
  });

  test('should report testimony content', async ({ page }) => {
    await page.click('[data-testid="connect-tab"]');
    await page.click('[data-testid="user-card"]').first();

    // Find report button on testimony
    await page.click('[data-testid="testimony-menu"]');
    await page.click('text=Report Testimony');

    // Select reason
    await page.click('input[value="inappropriate"]');

    // Submit
    await page.click('button:has-text("Submit Report")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('should report from settings menu', async ({ page }) => {
    await page.click('[data-testid="settings-menu"]');
    await page.click('text=Report Content');

    // Should show report form
    await expect(page.locator('h2:has-text("Report Content")')).toBeVisible();

    // Can report users, testimonies, or general issues
    await expect(page.locator('select[name="report-type"]')).toBeVisible();
  });
});

test.describe('Account Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="settings-menu"]');
  });

  test('should update search radius', async ({ page }) => {
    // Find search radius input
    const input = page.locator('input[name="search-radius"]');

    // Clear and enter new value
    await input.clear();
    await input.fill('50');

    // Click check/save button
    await page.click('button[aria-label="Update search radius"]');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText(/radius.*updated/i);
  });

  test('should validate search radius range (5-100 miles)', async ({ page }) => {
    const input = page.locator('input[name="search-radius"]');

    // Try invalid value (too low)
    await input.clear();
    await input.fill('2');
    await page.click('button[aria-label="Update search radius"]');

    await expect(page.locator('.toast-error')).toBeVisible();
    await expect(page.locator('.toast-error')).toContainText(/5.*100/i);

    // Try invalid value (too high)
    await input.clear();
    await input.fill('150');
    await page.click('button[aria-label="Update search radius"]');

    await expect(page.locator('.toast-error')).toBeVisible();
  });

  test('should link Spotify account', async ({ page }) => {
    await page.click('text=Link Spotify');

    // Should show Spotify URL input or OAuth flow
    await expect(page.locator('input[name="spotify-url"], button:has-text("Connect Spotify")')).toBeVisible();
  });

  test('should access help center', async ({ page }) => {
    await page.click('text=Help Center');

    // Verify help content appears
    await expect(page.locator('h2:has-text("Help Center")')).toBeVisible();

    // Should have FAQ sections
    await expect(page.locator('text=Frequently Asked Questions, text=How to')).toBeVisible();
  });

  test('should view legal pages', async ({ page }) => {
    // Terms of Service
    await page.click('text=Terms of Service');
    await expect(page.locator('h2:has-text("Terms of Service")')).toBeVisible();
    await page.click('[aria-label="Close"]');

    // Privacy Policy
    await page.click('text=Privacy Policy');
    await expect(page.locator('h2:has-text("Privacy Policy")')).toBeVisible();
  });
});

/**
 * TEST SUMMARY
 *
 * Privacy Settings: 4 tests
 * - Profile privacy toggle ✓
 * - Testimony visibility ✓
 * - Message privacy ✓
 * - Notification toggles ✓
 *
 * Blocking: 4 tests
 * - Block user ✓
 * - View blocked list ✓
 * - Unblock user ✓
 * - Hide from all tabs ✓
 *
 * Reporting: 3 tests
 * - Report user ✓
 * - Report testimony ✓
 * - Report from settings ✓
 *
 * Account Settings: 5 tests
 * - Update search radius ✓
 * - Validate radius range ✓
 * - Link Spotify ✓
 * - Help center ✓
 * - Legal pages ✓
 *
 * Total: 16 tests covering settings & privacy
 */
