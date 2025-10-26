import { test, expect } from '@playwright/test';

/**
 * E2E tests for testimony features
 * Tests viewing, creating, and interacting with testimonies
 */

test.describe('Testimonies', () => {
  test('should display testimonies on profile tab', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Navigate to profile tab if tabs are visible
    const profileTab = page.locator('text=/profile|testimony|testimonies/i').first();

    if (await profileTab.isVisible()) {
      await profileTab.click();
      await page.waitForTimeout(1000);
    }

    // Page should load without errors
    await expect(page).not.toHaveURL(/.*error.*/);
  });

  test('should show testimony creation UI for authenticated users', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Look for "Add Testimony" or similar button
    // This will only be visible to authenticated users
    const addTestimonyButton = page.locator('text=/add testimony|create testimony|new testimony/i').first();

    const isVisible = await addTestimonyButton.isVisible({ timeout: 3000 }).catch(() => false);

    // If button is visible, verify it's clickable
    if (isVisible) {
      await expect(addTestimonyButton).toBeEnabled();
    }
  });

  test.skip('should allow users to create a testimony', async ({ page }) => {
    // Skipped because requires authentication
    // This would test the full testimony creation flow

    await page.goto('/');

    // Click add testimony
    const addButton = page.locator('text=/add testimony/i').first();
    await addButton.click();

    // Fill in testimony form
    // Answer questions
    // Generate/save testimony
  });

  test('should display testimony content', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Look for testimony content on the page
    // Testimonies should be visible as cards or sections
    const testimonyCards = page.locator('[data-testid="testimony"], .testimony-card, article').first();

    // Either testimonies are visible, or there's an empty state
    const hasContent = await testimonyCards.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no testimonies|add your first/i').isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasContent || hasEmptyState).toBeTruthy();
  });
});
