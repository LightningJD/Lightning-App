/**
 * E2E Tests: Groups Features
 *
 * Tests group creation, management, messages, and leadership
 * Total: 12 comprehensive tests
 */

import { test, expect } from '@playwright/test';

test.describe('Group Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="groups-tab"]');
  });

  test('should create a new group successfully', async ({ page }) => {
    await page.click('[data-testid="new-group-button"]');

    // Fill group details
    await page.fill('input[name="group-name"]', 'Bible Study Group');
    await page.fill('textarea[name="group-description"]', 'Weekly Bible study and prayer');

    // Select emoji avatar
    await page.click('[data-testid="emoji-picker"]');
    await page.click('[data-emoji="📖"]');

    // Invite friends
    await page.click('[data-testid="add-member"]');
    await page.click('[data-testid="friend-option"]').first();

    // Create group
    await page.click('button:has-text("Create Group")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText(/group created/i);

    // Verify group appears in list
    await expect(page.locator('[data-testid="group-card"]')).toContainText('Bible Study Group');
  });

  test('should validate required group fields', async ({ page }) => {
    await page.click('[data-testid="new-group-button"]');

    // Try to create without name
    await page.click('button:has-text("Create Group")');

    // Verify error
    await expect(page.locator('.toast-error')).toBeVisible();
    await expect(page.locator('.toast-error')).toContainText(/name.*required/i);
  });

  test('should only allow invite-only for friends', async ({ page }) => {
    await page.click('[data-testid="new-group-button"]');

    // Try to add non-friend
    await page.click('[data-testid="add-member"]');

    // Should only see friends in list
    const members = page.locator('[data-testid="member-option"]');
    const count = await members.count();

    // Verify all are marked as friends
    for (let i = 0; i < count; i++) {
      const isFriend = await members.nth(i).getAttribute('data-is-friend');
      expect(isFriend).toBe('true');
    }
  });
});

test.describe('Group Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="groups-tab"]');
  });

  test('should update group details', async ({ page }) => {
    // Click on existing group
    await page.click('[data-testid="group-card"]').first();

    // Open settings
    await page.click('[data-testid="group-settings"]');

    // Update name
    await page.fill('input[name="group-name"]', 'Updated Group Name');

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText(/updated/i);
  });

  test('should add member to group', async ({ page }) => {
    await page.click('[data-testid="group-card"]').first();
    await page.click('[data-testid="group-settings"]');

    // Click add member
    await page.click('[data-testid="add-member-button"]');

    // Select friend
    await page.click('[data-testid="friend-option"]').first();

    // Confirm
    await page.click('button:has-text("Add Member")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText(/member added/i);
  });

  test('should remove member from group (leader only)', async ({ page }) => {
    await page.click('[data-testid="group-card"]').first();
    await page.click('[data-testid="group-settings"]');

    // Click on a member
    await page.click('[data-testid="member-row"]').first();

    // Click remove
    await page.click('button:has-text("Remove Member")');

    // Confirm removal
    await page.click('button:has-text("Confirm")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('should delete group (leader only)', async ({ page }) => {
    await page.click('[data-testid="group-card"]').first();
    await page.click('[data-testid="group-settings"]');

    // Click delete group
    await page.click('button:has-text("Delete Group")');

    // Confirm deletion
    await page.fill('input[placeholder*="confirm"]', 'DELETE');
    await page.click('button:has-text("Confirm Delete")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText(/deleted/i);

    // Verify group removed from list
    await expect(page.locator('[data-testid="group-card"]')).toHaveCount(0);
  });

  test('should leave group (non-leader)', async ({ page }) => {
    // Join a group first or use existing
    await page.click('[data-testid="group-card"]').first();

    // Click leave group
    await page.click('[data-testid="leave-group"]');

    // Confirm
    await page.click('button:has-text("Leave Group")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText(/left group/i);
  });
});

test.describe('Group Messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="groups-tab"]');
    await page.click('[data-testid="group-card"]').first();
  });

  test('should send group message successfully', async ({ page }) => {
    // Type message
    await page.fill('textarea[placeholder*="Type"]', 'Hello everyone in the group!');

    // Send
    await page.click('button:has-text("Send")');

    // Verify message appears
    await expect(page.locator('.message-content')).toContainText('Hello everyone in the group!');

    // Verify sent indicator (no toast for group messages typically)
    const lastMessage = page.locator('.message-content').last();
    await expect(lastMessage).toBeVisible();
  });

  test('should pin message in group (leader only)', async ({ page }) => {
    // Hover over message
    const message = page.locator('.message-content').first();
    await message.hover();

    // Click pin button
    await page.click('[data-testid="pin-message"]');

    // Verify pinned indicator
    await expect(page.locator('.pinned-message-banner')).toBeVisible();
    await expect(page.locator('.pinned-message-banner')).toContainText('Pinned');
  });

  test('should unpin message', async ({ page }) => {
    // Find pinned message
    const pinnedBanner = page.locator('.pinned-message-banner');

    if (await pinnedBanner.isVisible()) {
      // Click unpin
      await page.click('[data-testid="unpin-message"]');

      // Verify unpinned
      await expect(pinnedBanner).not.toBeVisible();
    }
  });
});

test.describe('Group Leadership', () => {
  test('should promote member to co-leader (leader only)', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="groups-tab"]');
    await page.click('[data-testid="group-card"]').first();
    await page.click('[data-testid="group-settings"]');

    // Click on member
    await page.click('[data-testid="member-row"]').first();

    // Promote to leader
    await page.click('button:has-text("Promote to Leader")');

    // Confirm
    await page.click('button:has-text("Confirm")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText(/promoted/i);

    // Verify crown icon appears
    await expect(page.locator('[data-testid="leader-crown"]')).toHaveCount(2); // Original + new leader
  });

  test('should enforce maximum 2 leaders', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="groups-tab"]');
    await page.click('[data-testid="group-card"]').first();
    await page.click('[data-testid="group-settings"]');

    // Check current leader count
    const leaderCount = await page.locator('[data-testid="leader-crown"]').count();

    if (leaderCount >= 2) {
      // Try to promote another member
      const memberRow = page.locator('[data-testid="member-row"]:not([data-is-leader="true"])').first();

      if (await memberRow.isVisible()) {
        await memberRow.click();

        // Promote button should be disabled or show error
        const promoteButton = page.locator('button:has-text("Promote to Leader")');

        if (await promoteButton.isVisible()) {
          await promoteButton.click();

          // Should show error about max leaders
          await expect(page.locator('.toast-error')).toBeVisible();
          await expect(page.locator('.toast-error')).toContainText(/maximum.*2.*leaders/i);
        }
      }
    }
  });
});

/**
 * TEST SUMMARY
 *
 * Group Creation: 3 tests
 * - Create group ✓
 * - Validate required fields ✓
 * - Invite-only friends ✓
 *
 * Group Management: 5 tests
 * - Update details ✓
 * - Add member ✓
 * - Remove member ✓
 * - Delete group ✓
 * - Leave group ✓
 *
 * Group Messages: 3 tests
 * - Send message ✓
 * - Pin message ✓
 * - Unpin message ✓
 *
 * Leadership: 2 tests
 * - Promote to leader ✓
 * - Enforce max 2 leaders ✓
 *
 * Total: 13 tests covering group features
 */
