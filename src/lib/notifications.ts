/**
 * Enhanced Notifications Module
 *
 * Handles notification preferences including:
 * - Per-group mute settings
 * - Quiet hours configuration
 * - Digest mode (batch notifications)
 * - Do Not Disturb (DND) toggle
 *
 * Preferences are stored in localStorage for client-side control.
 * For production, sync to Supabase for cross-device settings.
 */

// ============================================
// TYPES
// ============================================

export type DigestFrequency = 'off' | 'hourly' | 'daily' | 'weekly';

export interface QuietHours {
  enabled: boolean;
  startHour: number; // 0-23
  startMinute: number; // 0-59
  endHour: number; // 0-23
  endMinute: number; // 0-59
}

export interface GroupNotificationSettings {
  muted: boolean;
  mutedUntil?: string; // ISO date string, null = permanently muted
}

export interface NotificationPreferences {
  dndEnabled: boolean;
  quietHours: QuietHours;
  digestMode: DigestFrequency;
  groupSettings: Record<string, GroupNotificationSettings>;
  lastDigestSent?: string;
}

// ============================================
// DEFAULTS
// ============================================

const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  startHour: 22,
  startMinute: 0,
  endHour: 7,
  endMinute: 0,
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  dndEnabled: false,
  quietHours: DEFAULT_QUIET_HOURS,
  digestMode: 'off',
  groupSettings: {},
};

const STORAGE_KEY = 'lightning_notification_prefs';

// ============================================
// PERSISTENCE
// ============================================

/**
 * Load notification preferences from localStorage
 */
export const loadNotificationPreferences = (): NotificationPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {
      ...DEFAULT_PREFERENCES,
      quietHours: { ...DEFAULT_QUIET_HOURS },
      groupSettings: {},
    };

    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      quietHours: { ...DEFAULT_QUIET_HOURS, ...parsed.quietHours },
      groupSettings: { ...(parsed.groupSettings || {}) },
    };
  } catch {
    return {
      ...DEFAULT_PREFERENCES,
      quietHours: { ...DEFAULT_QUIET_HOURS },
      groupSettings: {},
    };
  }
};

/**
 * Save notification preferences to localStorage
 */
export const saveNotificationPreferences = (prefs: NotificationPreferences): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    console.error('Failed to save notification preferences');
  }
};

// ============================================
// DND (Do Not Disturb)
// ============================================

/**
 * Toggle DND mode
 */
export const toggleDND = (): boolean => {
  const prefs = loadNotificationPreferences();
  prefs.dndEnabled = !prefs.dndEnabled;
  saveNotificationPreferences(prefs);
  return prefs.dndEnabled;
};

/**
 * Set DND state explicitly
 */
export const setDND = (enabled: boolean): void => {
  const prefs = loadNotificationPreferences();
  prefs.dndEnabled = enabled;
  saveNotificationPreferences(prefs);
};

/**
 * Check if DND is currently active
 */
export const isDNDActive = (): boolean => {
  const prefs = loadNotificationPreferences();
  return prefs.dndEnabled;
};

// ============================================
// QUIET HOURS
// ============================================

/**
 * Update quiet hours settings
 */
export const setQuietHours = (quietHours: QuietHours): void => {
  const prefs = loadNotificationPreferences();
  prefs.quietHours = quietHours;
  saveNotificationPreferences(prefs);
};

/**
 * Check if we're currently in quiet hours
 */
export const isInQuietHours = (now?: Date): boolean => {
  const prefs = loadNotificationPreferences();
  if (!prefs.quietHours.enabled) return false;

  const currentTime = now || new Date();
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const startMinutes = prefs.quietHours.startHour * 60 + prefs.quietHours.startMinute;
  const endMinutes = prefs.quietHours.endHour * 60 + prefs.quietHours.endMinute;

  if (startMinutes <= endMinutes) {
    // Same day range (e.g., 9:00 - 17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight range (e.g., 22:00 - 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
};

// ============================================
// PER-GROUP MUTE
// ============================================

/**
 * Mute a group
 * @param duration - Duration in minutes. 0 = permanent. Default: 0
 */
export const muteGroup = (groupId: string, duration: number = 0): void => {
  const prefs = loadNotificationPreferences();
  const mutedUntil = duration > 0
    ? new Date(Date.now() + duration * 60000).toISOString()
    : undefined;

  prefs.groupSettings[groupId] = {
    muted: true,
    mutedUntil,
  };
  saveNotificationPreferences(prefs);
};

/**
 * Unmute a group
 */
export const unmuteGroup = (groupId: string): void => {
  const prefs = loadNotificationPreferences();
  if (prefs.groupSettings[groupId]) {
    prefs.groupSettings[groupId].muted = false;
    prefs.groupSettings[groupId].mutedUntil = undefined;
  }
  saveNotificationPreferences(prefs);
};

/**
 * Check if a group is currently muted
 */
export const isGroupMuted = (groupId: string): boolean => {
  const prefs = loadNotificationPreferences();
  const settings = prefs.groupSettings[groupId];
  if (!settings?.muted) return false;

  // Check if timed mute has expired
  if (settings.mutedUntil) {
    if (new Date(settings.mutedUntil) <= new Date()) {
      // Mute expired, unmute
      unmuteGroup(groupId);
      return false;
    }
  }

  return true;
};

/**
 * Get mute expiry for a group (null if permanently muted or not muted)
 */
export const getGroupMuteExpiry = (groupId: string): string | null => {
  const prefs = loadNotificationPreferences();
  return prefs.groupSettings[groupId]?.mutedUntil || null;
};

// ============================================
// DIGEST MODE
// ============================================

/**
 * Set digest frequency
 */
export const setDigestMode = (frequency: DigestFrequency): void => {
  const prefs = loadNotificationPreferences();
  prefs.digestMode = frequency;
  saveNotificationPreferences(prefs);
};

/**
 * Get current digest frequency
 */
export const getDigestMode = (): DigestFrequency => {
  const prefs = loadNotificationPreferences();
  return prefs.digestMode;
};

/**
 * Check if a digest notification should be sent based on frequency
 */
export const shouldSendDigest = (): boolean => {
  const prefs = loadNotificationPreferences();
  if (prefs.digestMode === 'off') return false;
  if (!prefs.lastDigestSent) return true;

  const lastSent = new Date(prefs.lastDigestSent);
  const now = new Date();
  const diffMs = now.getTime() - lastSent.getTime();
  const diffHours = diffMs / 3600000;

  switch (prefs.digestMode) {
    case 'hourly': return diffHours >= 1;
    case 'daily': return diffHours >= 24;
    case 'weekly': return diffHours >= 168;
    default: return false;
  }
};

/**
 * Mark digest as sent
 */
export const markDigestSent = (): void => {
  const prefs = loadNotificationPreferences();
  prefs.lastDigestSent = new Date().toISOString();
  saveNotificationPreferences(prefs);
};

// ============================================
// NOTIFICATION DECISION
// ============================================

/**
 * Determine if a notification should be shown for a given group
 * Considers DND, quiet hours, group mute, and bypass settings
 */
export const shouldShowNotification = (
  groupId: string,
  bypassMute: boolean = false
): boolean => {
  // DND blocks everything except bypass
  if (isDNDActive() && !bypassMute) return false;

  // Quiet hours blocks everything except bypass
  if (isInQuietHours() && !bypassMute) return false;

  // Group mute blocks unless bypassed
  if (isGroupMuted(groupId) && !bypassMute) return false;

  // Digest mode: queue instead of immediate
  const digest = getDigestMode();
  if (digest !== 'off') return false;

  return true;
};

// ============================================
// MUTE DURATION HELPERS
// ============================================

export const MUTE_DURATIONS = [
  { value: 60, label: '1 hour' },
  { value: 480, label: '8 hours' },
  { value: 1440, label: '24 hours' },
  { value: 10080, label: '1 week' },
  { value: 0, label: 'Until I turn it off' },
] as const;

/**
 * Format remaining mute time
 */
export const formatMuteRemaining = (mutedUntil: string): string => {
  const expiry = new Date(mutedUntil);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m remaining`;
  if (diffHours < 24) return `${diffHours}h remaining`;
  return `${diffDays}d remaining`;
};
