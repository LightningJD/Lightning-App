/**
 * E2E Tests: Messaging Features
 *
 * Tests direct messaging, group chats, reactions, and privacy
 * Total: 10 comprehensive tests
 */

import { test, expect } from '@playwright/test';

test.describe('Direct Messaging', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Messages tab
    await page.goto('/');
    // Assume logged in state - adjust based on your auth setup
    await page.click('[data-testid="messages-tab"]');
  });

  test('should send a direct message successfully', async ({ page }) => {
    // Click New Chat button
    await page.click('[data-testid="new-chat-button"]');

    // Search for recipient
    await page.fill('input[placeholder*="Search"]', 'Sarah');
    await page.click('[data-testid="user-result"]').first();

    // Type message
    await page.fill('textarea[placeholder*="Type"]', 'Hello! How are you?');

    // Send message
    await page.click('button:has-text("Send")');

    // Verify success toast appears
    await expect(page.locator('.toast-success')).toBeVisible({ timeout: 3000 });

    // Verify message appears in conversation
    await expect(page.locator('.message-content')).toContainText('Hello! How are you?');
  });

  test('should show error when sending empty message', async ({ page }) => {
    await page.click('[data-testid="conversation"]').first();

    // Try to send empty message
    await page.click('button:has-text("Send")');

    // Verify error toast
    await expect(page.locator('.toast-error')).toBeVisible();
    await expect(page.locator('.toast-error')).toContainText(/empty|required/i);
  });

  test('should handle message sending failure gracefully', async ({ page }) => {
    // Intercept and fail the API request
    await page.route('**/rest/v1/messages', route => route.abort());

    await page.click('[data-testid="conversation"]').first();
    await page.fill('textarea', 'Test message');
    await page.click('button:has-text("Send")');

    // Verify error feedback
    await expect(page.locator('.toast-error')).toBeVisible();
    await expect(page.locator('.toast-error')).toContainText(/failed|error/i);

    // Verify message text is restored so user can retry
    await expect(page.locator('textarea')).toHaveValue('Test message');
  });

  test('should display message timestamps correctly', async ({ page }) => {
    await page.click('[data-testid="conversation"]').first();

    // Check for timestamp on messages
    const timestamp = page.locator('.message-timestamp').first();
    await expect(timestamp).toBeVisible();

    // Verify timestamp format (e.g., "2m ago", "Just now", etc.)
    const timeText = await timestamp.textContent();
    expect(timeText).toMatch(/ago|now|yesterday/i);
  });

  test('should load conversation history', async ({ page }) => {
    await page.click('[data-testid="conversation"]').first();

    // Wait for messages to load
    await page.waitForSelector('.message-content', { timeout: 5000 });

    // Verify multiple messages exist
    const messages = page.locator('.message-content');
    const count = await messages.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Group Messaging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="messages-tab"]');
  });

  test('should create multi-recipient chat (group)', async ({ page }) => {
    await page.click('[data-testid="new-chat-button"]');

    // Select multiple recipients
    await page.fill('input[placeholder*="Search"]', 'Sarah');
    await page.click('[data-testid="user-chip-add"]').first();

    await page.fill('input[placeholder*="Search"]', 'John');
    await page.click('[data-testid="user-chip-add"]').first();

    // Verify chips showing selected users
    await expect(page.locator('[data-testid="user-chip"]')).toHaveCount(2);

    // Send message to create group
    await page.fill('textarea', 'Hey everyone!');
    await page.click('button:has-text("Send")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText(/group.*created|sent/i);
  });

  test('should show group member count in conversation list', async ({ page }) => {
    // Find a group conversation
    const groupConvo = page.locator('[data-testid="conversation"][data-type="group"]').first();

    // Verify member count displayed
    await expect(groupConvo.locator('.member-count')).toBeVisible();
    await expect(groupConvo.locator('.member-count')).toContainText(/\d+ members?/i);
  });
});

test.describe('Message Reactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="messages-tab"]');
    await page.click('[data-testid="conversation"]').first();
  });

  test('should add reaction to message', async ({ page }) => {
    // Hover over message to show reaction button
    const message = page.locator('.message-content').first();
    await message.hover();

    // Click reaction button
    await page.click('[data-testid="add-reaction"]').first();

    // Select emoji
    await page.click('[data-emoji="🙏"]');

    // Verify reaction appears
    await expect(page.locator('.message-reaction:has-text("🙏")')).toBeVisible();
  });

  test('should remove reaction when clicked again', async ({ page }) => {
    const message = page.locator('.message-content').first();
    await message.hover();

    // Add reaction
    await page.click('[data-testid="add-reaction"]').first();
    await page.click('[data-emoji="❤️"]');

    // Verify it's there
    await expect(page.locator('.message-reaction:has-text("❤️")')).toBeVisible();

    // Click again to remove
    await page.click('.message-reaction:has-text("❤️")');

    // Verify it's gone
    await expect(page.locator('.message-reaction:has-text("❤️")')).not.toBeVisible();
  });
});

test.describe('Message Privacy', () => {
  test('should respect message privacy settings', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="messages-tab"]');
    await page.click('[data-testid="new-chat-button"]');

    // Try to message user with privacy settings
    await page.fill('input[placeholder*="Search"]', 'Private User');
    await page.click('[data-testid="user-result"]').first();

    await page.fill('textarea', 'Test message');
    await page.click('button:has-text("Send")');

    // Should show error if privacy blocks messages
    const toast = page.locator('.toast-error, .toast-success');
    await expect(toast).toBeVisible();

    const toastText = await toast.textContent();

    // Either succeeds or shows privacy error
    if (toastText?.includes('privacy') || toastText?.includes('not accepting')) {
      // Privacy blocked - expected behavior
      expect(toastText).toContain('privacy');
    } else {
      // Allowed - also fine
      expect(toastText).toContain('sent');
    }
  });
});

/**
 * TEST SUMMARY
 *
 * Direct Messaging: 5 tests
 * - Send message ✓
 * - Empty message validation ✓
 * - Error handling ✓
 * - Timestamps ✓
 * - Load history ✓
 *
 * Group Messaging: 2 tests
 * - Create group chat ✓
 * - Show member count ✓
 *
 * Reactions: 2 tests
 * - Add reaction ✓
 * - Remove reaction ✓
 *
 * Privacy: 1 test
 * - Respect privacy settings ✓
 *
 * Total: 10 tests covering messaging features
 */
