/**
 * Enhanced Notifications Tests
 * Tests notification preferences, DND, quiet hours, digest mode, and per-group mute
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  toggleDND,
  setDND,
  isDNDActive,
  setQuietHours,
  isInQuietHours,
  muteGroup,
  unmuteGroup,
  isGroupMuted,
  getGroupMuteExpiry,
  setDigestMode,
  getDigestMode,
  shouldSendDigest,
  markDigestSent,
  shouldShowNotification,
  formatMuteRemaining,
  MUTE_DURATIONS,
} from '../lib/notifications';
import type { NotificationPreferences, QuietHours, DigestFrequency } from '../lib/notifications';

describe('Enhanced Notifications', () => {
  beforeEach(() => {
    // Clear all localStorage items to prevent state leaks
    try { localStorage.clear(); } catch { /* ignore */ }
    try { localStorage.removeItem('lightning_notification_prefs'); } catch { /* ignore */ }
  });

  // ===========================================
  // Default Preferences Tests
  // ===========================================
  describe('Default Preferences', () => {
    it('should return defaults when no saved preferences', () => {
      const prefs = loadNotificationPreferences();
      expect(prefs.dndEnabled).toBe(false);
      expect(prefs.quietHours.enabled).toBe(false);
      expect(prefs.digestMode).toBe('off');
      expect(prefs.groupSettings).toEqual({});
    });

    it('should have default quiet hours of 10PM to 7AM', () => {
      const prefs = loadNotificationPreferences();
      expect(prefs.quietHours.startHour).toBe(22);
      expect(prefs.quietHours.startMinute).toBe(0);
      expect(prefs.quietHours.endHour).toBe(7);
      expect(prefs.quietHours.endMinute).toBe(0);
    });
  });

  // ===========================================
  // Persistence Tests
  // ===========================================
  describe('Persistence', () => {
    it('should save and load preferences', () => {
      const prefs = loadNotificationPreferences();
      prefs.dndEnabled = true;
      saveNotificationPreferences(prefs);

      const loaded = loadNotificationPreferences();
      expect(loaded.dndEnabled).toBe(true);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('lightning_notification_prefs', 'invalid json');
      const prefs = loadNotificationPreferences();
      expect(prefs.dndEnabled).toBe(false); // Should return defaults
    });

    it('should merge with defaults on partial data', () => {
      localStorage.setItem('lightning_notification_prefs', JSON.stringify({
        dndEnabled: true,
      }));
      const prefs = loadNotificationPreferences();
      expect(prefs.dndEnabled).toBe(true);
      expect(prefs.quietHours.enabled).toBe(false); // Default
      expect(prefs.digestMode).toBe('off'); // Default
    });
  });

  // ===========================================
  // DND Tests
  // ===========================================
  describe('Do Not Disturb', () => {
    it('should start as disabled', () => {
      expect(isDNDActive()).toBe(false);
    });

    it('should toggle DND on', () => {
      const result = toggleDND();
      expect(result).toBe(true);
      expect(isDNDActive()).toBe(true);
    });

    it('should toggle DND off', () => {
      toggleDND(); // on
      const result = toggleDND(); // off
      expect(result).toBe(false);
      expect(isDNDActive()).toBe(false);
    });

    it('should set DND explicitly', () => {
      setDND(true);
      expect(isDNDActive()).toBe(true);
      setDND(false);
      expect(isDNDActive()).toBe(false);
    });
  });

  // ===========================================
  // Quiet Hours Tests
  // ===========================================
  describe('Quiet Hours', () => {
    it('should not be in quiet hours when disabled', () => {
      expect(isInQuietHours()).toBe(false);
    });

    it('should detect when in quiet hours (overnight range)', () => {
      setQuietHours({
        enabled: true,
        startHour: 22,
        startMinute: 0,
        endHour: 7,
        endMinute: 0,
      });

      // 11 PM should be in quiet hours
      const lateNight = new Date();
      lateNight.setHours(23, 0, 0, 0);
      expect(isInQuietHours(lateNight)).toBe(true);

      // 3 AM should be in quiet hours
      const earlyMorning = new Date();
      earlyMorning.setHours(3, 0, 0, 0);
      expect(isInQuietHours(earlyMorning)).toBe(true);

      // 10 AM should NOT be in quiet hours
      const morning = new Date();
      morning.setHours(10, 0, 0, 0);
      expect(isInQuietHours(morning)).toBe(false);
    });

    it('should detect when in quiet hours (same day range)', () => {
      setQuietHours({
        enabled: true,
        startHour: 9,
        startMinute: 0,
        endHour: 17,
        endMinute: 0,
      });

      // 12 PM should be in quiet hours
      const noon = new Date();
      noon.setHours(12, 0, 0, 0);
      expect(isInQuietHours(noon)).toBe(true);

      // 8 PM should NOT be in quiet hours
      const evening = new Date();
      evening.setHours(20, 0, 0, 0);
      expect(isInQuietHours(evening)).toBe(false);
    });

    it('should handle boundary times correctly', () => {
      setQuietHours({
        enabled: true,
        startHour: 22,
        startMinute: 30,
        endHour: 6,
        endMinute: 30,
      });

      // Exactly at start time
      const atStart = new Date();
      atStart.setHours(22, 30, 0, 0);
      expect(isInQuietHours(atStart)).toBe(true);

      // Just before end time
      const beforeEnd = new Date();
      beforeEnd.setHours(6, 29, 0, 0);
      expect(isInQuietHours(beforeEnd)).toBe(true);

      // At end time (should NOT be in quiet hours)
      const atEnd = new Date();
      atEnd.setHours(6, 30, 0, 0);
      expect(isInQuietHours(atEnd)).toBe(false);
    });
  });

  // ===========================================
  // Per-Group Mute Tests
  // ===========================================
  describe('Per-Group Mute', () => {
    it('should not be muted by default', () => {
      expect(isGroupMuted('group-1')).toBe(false);
    });

    it('should mute a group permanently', () => {
      muteGroup('group-1');
      expect(isGroupMuted('group-1')).toBe(true);
      expect(getGroupMuteExpiry('group-1')).toBeNull();
    });

    it('should mute a group with duration', () => {
      muteGroup('group-1', 60); // 1 hour
      expect(isGroupMuted('group-1')).toBe(true);
      expect(getGroupMuteExpiry('group-1')).toBeTruthy();
    });

    it('should unmute a group', () => {
      muteGroup('group-1');
      expect(isGroupMuted('group-1')).toBe(true);
      unmuteGroup('group-1');
      expect(isGroupMuted('group-1')).toBe(false);
    });

    it('should auto-expire timed mute', () => {
      // Mute for 0 minutes (already expired)
      const prefs = loadNotificationPreferences();
      prefs.groupSettings['group-1'] = {
        muted: true,
        mutedUntil: new Date(Date.now() - 60000).toISOString(), // 1 min ago
      };
      saveNotificationPreferences(prefs);

      expect(isGroupMuted('group-1')).toBe(false); // Should auto-expire
    });

    it('should keep mute active for future expiry', () => {
      muteGroup('group-1', 60); // 1 hour from now
      expect(isGroupMuted('group-1')).toBe(true);
    });

    it('should mute different groups independently', () => {
      muteGroup('group-1');
      muteGroup('group-2');
      expect(isGroupMuted('group-1')).toBe(true);
      expect(isGroupMuted('group-2')).toBe(true);
      expect(isGroupMuted('group-3')).toBe(false);

      unmuteGroup('group-1');
      expect(isGroupMuted('group-1')).toBe(false);
      expect(isGroupMuted('group-2')).toBe(true);
    });
  });

  // ===========================================
  // Digest Mode Tests
  // ===========================================
  describe('Digest Mode', () => {
    it('should default to off', () => {
      expect(getDigestMode()).toBe('off');
    });

    it('should set digest mode', () => {
      setDigestMode('daily');
      expect(getDigestMode()).toBe('daily');
    });

    it('should not send digest when mode is off', () => {
      setDigestMode('off');
      expect(shouldSendDigest()).toBe(false);
    });

    it('should send digest on first run', () => {
      setDigestMode('hourly');
      expect(shouldSendDigest()).toBe(true);
    });

    it('should not send digest before interval', () => {
      setDigestMode('daily');
      markDigestSent();
      expect(shouldSendDigest()).toBe(false);
    });

    it('should send digest after interval expires', () => {
      setDigestMode('hourly');
      const prefs = loadNotificationPreferences();
      prefs.lastDigestSent = new Date(Date.now() - 2 * 3600000).toISOString(); // 2 hours ago
      saveNotificationPreferences(prefs);
      expect(shouldSendDigest()).toBe(true);
    });

    it('should handle weekly digest', () => {
      setDigestMode('weekly');
      const prefs = loadNotificationPreferences();
      prefs.lastDigestSent = new Date(Date.now() - 8 * 24 * 3600000).toISOString(); // 8 days ago
      saveNotificationPreferences(prefs);
      expect(shouldSendDigest()).toBe(true);
    });
  });

  // ===========================================
  // shouldShowNotification Tests
  // ===========================================
  describe('shouldShowNotification', () => {
    beforeEach(() => {
      localStorage.removeItem('lightning_notification_prefs');
    });

    it('should show notification by default', () => {
      expect(shouldShowNotification('group-1')).toBe(true);
    });

    it('should block notification when DND is active', () => {
      setDND(true);
      expect(shouldShowNotification('group-1')).toBe(false);
    });

    it('should allow bypass when DND is active', () => {
      setDND(true);
      expect(shouldShowNotification('group-1', true)).toBe(true);
    });

    it('should block notification when group is muted', () => {
      muteGroup('group-1');
      expect(shouldShowNotification('group-1')).toBe(false);
    });

    it('should allow bypass for muted group', () => {
      muteGroup('group-1');
      expect(shouldShowNotification('group-1', true)).toBe(true);
    });

    it('should block when in digest mode', () => {
      setDigestMode('daily');
      expect(shouldShowNotification('group-1')).toBe(false);
    });

    it('should not show for unmuted group when another group is muted', () => {
      muteGroup('group-1');
      expect(shouldShowNotification('group-2')).toBe(true); // group-2 is not muted
    });
  });

  // ===========================================
  // Format Mute Remaining Tests
  // ===========================================
  describe('formatMuteRemaining', () => {
    it('should show "Expired" for past dates', () => {
      const past = new Date(Date.now() - 60000).toISOString();
      expect(formatMuteRemaining(past)).toBe('Expired');
    });

    it('should show minutes for short durations', () => {
      const thirtyMins = new Date(Date.now() + 30 * 60000).toISOString();
      const result = formatMuteRemaining(thirtyMins);
      expect(result).toMatch(/\d+m remaining/);
    });

    it('should show hours for medium durations', () => {
      const fiveHours = new Date(Date.now() + 5 * 3600000).toISOString();
      const result = formatMuteRemaining(fiveHours);
      expect(result).toMatch(/\d+h remaining/);
    });

    it('should show days for long durations', () => {
      const threeDays = new Date(Date.now() + 3 * 86400000).toISOString();
      const result = formatMuteRemaining(threeDays);
      expect(result).toMatch(/\d+d remaining/);
    });
  });

  // ===========================================
  // MUTE_DURATIONS Tests
  // ===========================================
  describe('Mute Duration Options', () => {
    it('should have 5 mute duration options', () => {
      expect(MUTE_DURATIONS).toHaveLength(5);
    });

    it('should include permanent option (value 0)', () => {
      const permanent = MUTE_DURATIONS.find(d => d.value === 0);
      expect(permanent).toBeDefined();
      expect(permanent!.label).toBe('Until I turn it off');
    });

    it('should include 1 hour option', () => {
      const oneHour = MUTE_DURATIONS.find(d => d.value === 60);
      expect(oneHour).toBeDefined();
      expect(oneHour!.label).toBe('1 hour');
    });

    it('should include 1 week option', () => {
      const oneWeek = MUTE_DURATIONS.find(d => d.value === 10080);
      expect(oneWeek).toBeDefined();
      expect(oneWeek!.label).toBe('1 week');
    });

    it('all durations should have labels', () => {
      MUTE_DURATIONS.forEach(d => {
        expect(d.label).toBeTruthy();
        expect(typeof d.value).toBe('number');
      });
    });
  });
});
