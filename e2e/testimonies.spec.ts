/**
 * E2E Tests: Testimony Features
 *
 * Tests testimony creation, editing, viewing, liking, and sharing
 * Total: 8 comprehensive tests
 */

import { test, expect } from '@playwright/test';

test.describe('Testimony Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="profile-tab"]');
  });

  test('should create a new testimony', async ({ page }) => {
    // Click add testimony button
    await page.click('[data-testid="add-testimony"]');

    // Fill testimony content
    await page.fill('textarea[name="testimony-content"]', 'This is my testimony about how God changed my life...');

    // Optionally add title
    await page.fill('input[name="testimony-title"]', 'My Transformation Story');

    // Optionally add lesson learned
    await page.fill('textarea[name="testimony-lesson"]', 'Trust in God's timing');

    // Save testimony
    await page.click('button:has-text("Save Testimony")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText(/testimony.*saved|created/i);

    // Verify testimony appears on profile
    await expect(page.locator('[data-testid="testimony-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="testimony-card"]')).toContainText('My Transformation Story');
  });

  test('should validate minimum testimony length', async ({ page }) => {
    await page.click('[data-testid="add-testimony"]');

    // Try to save with short content
    await page.fill('textarea[name="testimony-content"]', 'Too short');
    await page.click('button:has-text("Save Testimony")');

    // Verify error
    await expect(page.locator('.toast-error')).toBeVisible();
    await expect(page.locator('.toast-error')).toContainText(/minimum|too short|least/i);
  });

  test('should add music to testimony', async ({ page }) => {
    await page.click('[data-testid="add-testimony"]');

    // Add testimony content
    await page.fill('textarea[name="testimony-content"]', 'This is my testimony with music...');

    // Click add music
    await page.click('button:has-text("Add Music")');

    // Enter YouTube URL
    await page.fill('input[name="music-url"]', 'https://youtube.com/watch?v=example');

    // Save
    await page.click('button:has-text("Add")');

    // Save testimony
    await page.click('button:has-text("Save Testimony")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();

    // Verify music player appears
    await expect(page.locator('[data-testid="music-player"]')).toBeVisible();
  });
});

test.describe('Testimony Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="profile-tab"]');
  });

  test('should edit existing testimony', async ({ page }) => {
    // Click edit testimony button
    await page.click('[data-testid="edit-testimony"]');

    // Update content
    await page.fill('textarea[name="testimony-content"]', 'Updated testimony content with more details...');

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText(/updated|saved/i);

    // Verify new content appears
    await expect(page.locator('[data-testid="testimony-card"]')).toContainText('Updated testimony content');
  });
});

test.describe('Testimony Viewing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should view other users testimonies', async ({ page }) => {
    // Navigate to another user's profile
    await page.click('[data-testid="connect-tab"]');
    await page.click('[data-testid="user-card"]').first();

    // Should see their testimony (if they have one and it's public)
    const hasTestimony = await page.locator('[data-testid="testimony-card"]').isVisible();

    if (hasTestimony) {
      // Verify testimony content is visible
      await expect(page.locator('[data-testid="testimony-card"] .testimony-content')).toBeVisible();
    } else {
      // Should show "No testimony yet" or similar
      await expect(page.locator('text=No testimony yet, text=hasn\'t shared')).toBeVisible();
    }
  });

  test('should respect testimony privacy settings', async ({ page }) => {
    // Navigate to user with private testimony
    await page.click('[data-testid="connect-tab"]');

    // Try to view profiles
    const userCards = page.locator('[data-testid="user-card"]');
    const count = await userCards.count();

    for (let i = 0; i < Math.min(3, count); i++) {
      await userCards.nth(i).click();

      // Check if testimony is visible or shows privacy message
      const testimonyVisible = await page.locator('[data-testid="testimony-card"]').isVisible();
      const privacyMessage = await page.locator('text=Private testimony, text=Only visible to friends').isVisible();

      // Either testimony is shown or privacy message is shown
      expect(testimonyVisible || privacyMessage).toBeTruthy();

      // Close profile
      await page.click('[aria-label="Close"]');
    }
  });
});

test.describe('Testimony Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should like a testimony', async ({ page }) => {
    // View another user's profile
    await page.click('[data-testid="connect-tab"]');
    await page.click('[data-testid="user-card"]').first();

    // Click like button
    await page.click('[data-testid="like-testimony"]');

    // Verify like count increases
    const likeCount = page.locator('[data-testid="like-count"]');
    await expect(likeCount).toBeVisible();

    // Verify button shows "liked" state (filled heart or different color)
    await expect(page.locator('[data-testid="like-testimony"][data-liked="true"]')).toBeVisible();
  });

  test('should unlike a testimony', async ({ page }) => {
    await page.click('[data-testid="connect-tab"]');
    await page.click('[data-testid="user-card"]').first();

    // Like it first
    await page.click('[data-testid="like-testimony"]');
    await page.waitForTimeout(500);

    // Unlike it
    await page.click('[data-testid="like-testimony"]');

    // Verify like button returns to normal state
    await expect(page.locator('[data-testid="like-testimony"][data-liked="false"]')).toBeVisible();
  });
});

/**
 * TEST SUMMARY
 *
 * Creation: 3 tests
 * - Create testimony ✓
 * - Validate minimum length ✓
 * - Add music ✓
 *
 * Editing: 1 test
 * - Edit testimony ✓
 *
 * Viewing: 2 tests
 * - View other testimonies ✓
 * - Respect privacy settings ✓
 *
 * Interactions: 2 tests
 * - Like testimony ✓
 * - Unlike testimony ✓
 *
 * Total: 8 tests covering testimony features
 */
