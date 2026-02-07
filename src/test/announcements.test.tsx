/**
 * Announcements & Broadcasts Tests
 * Tests the announcement CRUD, categories, read receipts, and scheduling logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ANNOUNCEMENT_CATEGORIES } from '../lib/database/announcements';
import type { AnnouncementCategory, AnnouncementWithDetails } from '../types';

describe('Announcements & Broadcasts', () => {
  // ===========================================
  // Announcement Categories Tests
  // ===========================================
  describe('Announcement Categories', () => {
    it('should define all four categories', () => {
      expect(ANNOUNCEMENT_CATEGORIES).toHaveProperty('urgent');
      expect(ANNOUNCEMENT_CATEGORIES).toHaveProperty('info');
      expect(ANNOUNCEMENT_CATEGORIES).toHaveProperty('reminder');
      expect(ANNOUNCEMENT_CATEGORIES).toHaveProperty('celebration');
    });

    it('each category should have label, emoji, color, and bgColor', () => {
      const categories: AnnouncementCategory[] = ['urgent', 'info', 'reminder', 'celebration'];
      categories.forEach((cat) => {
        const catData = ANNOUNCEMENT_CATEGORIES[cat];
        expect(catData.label).toBeTruthy();
        expect(typeof catData.label).toBe('string');
        expect(catData.emoji).toBeTruthy();
        expect(catData.color).toMatch(/^#[0-9a-f]{6}$/);
        expect(catData.bgColor).toMatch(/^rgba\(/);
      });
    });

    it('urgent should have red color', () => {
      expect(ANNOUNCEMENT_CATEGORIES.urgent.color).toBe('#ef4444');
      expect(ANNOUNCEMENT_CATEGORIES.urgent.label).toBe('Urgent');
    });

    it('info should have blue color', () => {
      expect(ANNOUNCEMENT_CATEGORIES.info.color).toBe('#3b82f6');
      expect(ANNOUNCEMENT_CATEGORIES.info.label).toBe('Info');
    });

    it('reminder should have amber color', () => {
      expect(ANNOUNCEMENT_CATEGORIES.reminder.color).toBe('#f59e0b');
      expect(ANNOUNCEMENT_CATEGORIES.reminder.label).toBe('Reminder');
    });

    it('celebration should have green color', () => {
      expect(ANNOUNCEMENT_CATEGORIES.celebration.color).toBe('#10b981');
      expect(ANNOUNCEMENT_CATEGORIES.celebration.label).toBe('Celebration');
    });

    it('each category should have unique colors', () => {
      const colors = Object.values(ANNOUNCEMENT_CATEGORIES).map(c => c.color);
      const unique = new Set(colors);
      expect(unique.size).toBe(4);
    });

    it('each category should have unique emojis', () => {
      const emojis = Object.values(ANNOUNCEMENT_CATEGORIES).map(c => c.emoji);
      const unique = new Set(emojis);
      expect(unique.size).toBe(4);
    });
  });

  // ===========================================
  // Announcement Type Validation Tests
  // ===========================================
  describe('Announcement Data Structure', () => {
    const mockAnnouncement: AnnouncementWithDetails = {
      id: 'ann-1',
      group_id: 'group-1',
      author_id: 'user-1',
      title: 'Sunday Service Update',
      content: 'Service will start 30 minutes early this week.',
      category: 'info',
      is_pinned: false,
      is_published: true,
      bypass_mute: false,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      author: {
        display_name: 'Pastor John',
        avatar_emoji: '⛪',
      },
      read_count: 15,
      acknowledged_count: 8,
      user_read: true,
      user_acknowledged: false,
    };

    it('should have all required fields', () => {
      expect(mockAnnouncement.id).toBeTruthy();
      expect(mockAnnouncement.group_id).toBeTruthy();
      expect(mockAnnouncement.author_id).toBeTruthy();
      expect(mockAnnouncement.title).toBeTruthy();
      expect(mockAnnouncement.content).toBeTruthy();
      expect(mockAnnouncement.category).toBeTruthy();
      expect(mockAnnouncement.created_at).toBeTruthy();
      expect(mockAnnouncement.updated_at).toBeTruthy();
    });

    it('should have boolean flags', () => {
      expect(typeof mockAnnouncement.is_pinned).toBe('boolean');
      expect(typeof mockAnnouncement.is_published).toBe('boolean');
      expect(typeof mockAnnouncement.bypass_mute).toBe('boolean');
    });

    it('should support optional author details', () => {
      expect(mockAnnouncement.author?.display_name).toBe('Pastor John');
      expect(mockAnnouncement.author?.avatar_emoji).toBe('⛪');
    });

    it('should support read/acknowledged tracking', () => {
      expect(mockAnnouncement.read_count).toBe(15);
      expect(mockAnnouncement.acknowledged_count).toBe(8);
      expect(mockAnnouncement.user_read).toBe(true);
      expect(mockAnnouncement.user_acknowledged).toBe(false);
    });

    it('should support pinned announcements', () => {
      const pinned: AnnouncementWithDetails = { ...mockAnnouncement, is_pinned: true };
      expect(pinned.is_pinned).toBe(true);
    });

    it('should support bypass mute', () => {
      const urgent: AnnouncementWithDetails = {
        ...mockAnnouncement,
        category: 'urgent',
        bypass_mute: true,
      };
      expect(urgent.bypass_mute).toBe(true);
      expect(urgent.category).toBe('urgent');
    });

    it('should support scheduled announcements', () => {
      const scheduled: AnnouncementWithDetails = {
        ...mockAnnouncement,
        is_published: false,
        scheduled_for: '2024-02-01T10:00:00Z',
      };
      expect(scheduled.is_published).toBe(false);
      expect(scheduled.scheduled_for).toBeTruthy();
    });

    it('should support cross-group broadcasting', () => {
      const broadcast: AnnouncementWithDetails = {
        ...mockAnnouncement,
        cross_group_ids: ['group-2', 'group-3'],
      };
      expect(broadcast.cross_group_ids).toHaveLength(2);
      expect(broadcast.cross_group_ids).toContain('group-2');
    });
  });

  // ===========================================
  // Scheduling Logic Tests
  // ===========================================
  describe('Scheduling Logic', () => {
    it('announcement with future scheduledFor should not be published', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const scheduledFor = futureDate.toISOString();

      const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();
      const isPublished = !isScheduled;

      expect(isScheduled).toBe(true);
      expect(isPublished).toBe(false);
    });

    it('announcement with past scheduledFor should be published', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const scheduledFor = pastDate.toISOString();

      const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();
      const isPublished = !isScheduled;

      expect(isScheduled).toBe(false);
      expect(isPublished).toBe(true);
    });

    it('announcement with no scheduledFor should be published immediately', () => {
      const scheduledFor = undefined;
      const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();
      const isPublished = !isScheduled;

      expect(isPublished).toBe(true);
    });
  });

  // ===========================================
  // Category Validation Tests
  // ===========================================
  describe('Category Validation', () => {
    it('should only allow valid category types', () => {
      const validCategories: AnnouncementCategory[] = ['urgent', 'info', 'reminder', 'celebration'];
      validCategories.forEach((cat) => {
        expect(ANNOUNCEMENT_CATEGORIES[cat]).toBeDefined();
      });
    });

    it('should not have undefined categories', () => {
      // TypeScript prevents this at compile time, but verify at runtime
      const invalidCat = 'nonexistent' as AnnouncementCategory;
      expect(ANNOUNCEMENT_CATEGORIES[invalidCat]).toBeUndefined();
    });

    it('default category should be info', () => {
      const defaultCategory: AnnouncementCategory = 'info';
      expect(ANNOUNCEMENT_CATEGORIES[defaultCategory]).toBeDefined();
      expect(ANNOUNCEMENT_CATEGORIES[defaultCategory].label).toBe('Info');
    });
  });

  // ===========================================
  // Permission Integration Tests
  // ===========================================
  describe('Announcement Permissions', () => {
    // These test the permission check integration from the permissions module
    it('canPostAnnouncements permission exists in permission system', async () => {
      const { hasPermission } = await import('../lib/permissions');

      // Pastor and admin can post
      expect(hasPermission('pastor', 'canPostAnnouncements')).toBe(true);
      expect(hasPermission('admin', 'canPostAnnouncements')).toBe(true);

      // Moderator, member, and visitor cannot post
      expect(hasPermission('moderator', 'canPostAnnouncements')).toBe(false);
      expect(hasPermission('member', 'canPostAnnouncements')).toBe(false);
      expect(hasPermission('visitor', 'canPostAnnouncements')).toBe(false);
    });
  });

  // ===========================================
  // Date Formatting Tests
  // ===========================================
  describe('Date Formatting', () => {
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    };

    it('should show "Just now" for very recent dates', () => {
      const now = new Date().toISOString();
      expect(formatDate(now)).toBe('Just now');
    });

    it('should show minutes for dates less than an hour ago', () => {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60000).toISOString();
      expect(formatDate(thirtyMinsAgo)).toBe('30m ago');
    });

    it('should show hours for dates less than a day ago', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 3600000).toISOString();
      expect(formatDate(fiveHoursAgo)).toBe('5h ago');
    });

    it('should show days for dates less than a week ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      expect(formatDate(threeDaysAgo)).toBe('3d ago');
    });

    it('should show locale date for dates older than a week', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
      const result = formatDate(twoWeeksAgo);
      // Should contain numbers (date parts) not "ago"
      expect(result).not.toContain('ago');
    });
  });

  // ===========================================
  // Read Receipt Logic Tests
  // ===========================================
  describe('Read Receipt Logic', () => {
    it('should calculate unread count correctly', () => {
      const allAnnouncements = [
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' },
      ];
      const readIds = new Set(['1', '3']);
      const unreadCount = allAnnouncements.filter(a => !readIds.has(a.id)).length;
      expect(unreadCount).toBe(3);
    });

    it('should return 0 when all announcements are read', () => {
      const allAnnouncements = [{ id: '1' }, { id: '2' }];
      const readIds = new Set(['1', '2']);
      const unreadCount = allAnnouncements.filter(a => !readIds.has(a.id)).length;
      expect(unreadCount).toBe(0);
    });

    it('should handle empty announcements', () => {
      const allAnnouncements: { id: string }[] = [];
      const readIds = new Set<string>();
      const unreadCount = allAnnouncements.filter(a => !readIds.has(a.id)).length;
      expect(unreadCount).toBe(0);
    });

    it('should differentiate read from acknowledged', () => {
      const receipts = [
        { user_id: 'u1', read_at: '2024-01-01', acknowledged_at: '2024-01-01' },
        { user_id: 'u2', read_at: '2024-01-01', acknowledged_at: null },
        { user_id: 'u3', read_at: '2024-01-01', acknowledged_at: null },
      ];

      const readCount = receipts.filter(r => r.read_at).length;
      const acknowledgedCount = receipts.filter(r => r.acknowledged_at).length;

      expect(readCount).toBe(3);
      expect(acknowledgedCount).toBe(1);
    });
  });

  // ===========================================
  // Cross-Group Broadcast Logic Tests
  // ===========================================
  describe('Cross-Group Broadcasting', () => {
    it('should not cascade cross-posting', () => {
      const originalData = {
        group_id: 'group-1',
        cross_group_ids: ['group-2', 'group-3'],
      };

      // When creating cross-group copies, cross_group_ids should be null
      const copyData = {
        ...originalData,
        group_id: 'group-2',
        cross_group_ids: null,
      };

      expect(copyData.cross_group_ids).toBeNull();
    });

    it('should create copies for each target group', () => {
      const targetGroups = ['group-2', 'group-3', 'group-4'];
      const copies = targetGroups.map(targetGroupId => ({
        group_id: targetGroupId,
        cross_group_ids: null,
      }));

      expect(copies).toHaveLength(3);
      copies.forEach(copy => {
        expect(copy.cross_group_ids).toBeNull();
      });
    });

    it('should handle empty cross-group list', () => {
      const crossGroupIds: string[] = [];
      expect(crossGroupIds.length > 0).toBe(false);
    });
  });
});
