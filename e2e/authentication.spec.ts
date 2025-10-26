import { test, expect } from '@playwright/test';

/**
 * E2E tests for authentication flows
 * Tests sign up, sign in, and guest access
 */

test.describe('Authentication', () => {
  test('should show sign in/sign up options', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Look for authentication UI elements
    // Update selectors based on your actual Clerk implementation
    const authElements = page.locator('text=/sign in|sign up|log in|get started/i').first();

    // The page should have some authentication option visible
    const hasAuthUI = await authElements.isVisible().catch(() => false);

    // Either auth UI is visible, or user is already signed in
    expect(hasAuthUI || await page.locator('[data-testid="profile"], [data-testid="user-menu"]').isVisible().catch(() => false)).toBeTruthy();
  });

  test('should allow guest access to view content', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // As a guest, should be able to view public content
    // Check if the page loads without requiring immediate authentication
    await expect(page).not.toHaveURL(/.*sign-in.*/);
  });

  test.skip('should handle sign up flow', async ({ page }) => {
    // This test is skipped because it requires Clerk to be configured
    // and would create test accounts

    await page.goto('/');

    // Click sign up button (update selector based on your UI)
    const signUpButton = page.locator('text=/sign up|get started/i').first();
    await signUpButton.click();

    // Clerk modal should appear
    // Add assertions based on Clerk's UI
  });
});
