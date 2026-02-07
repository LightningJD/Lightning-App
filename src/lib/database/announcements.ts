/**
 * Announcements & Broadcasts Database Operations
 *
 * Handles CRUD for group announcements, read receipts,
 * acknowledgments, scheduled posts, and cross-group broadcasts.
 */

import { supabase } from '../supabase';
import type { Announcement, AnnouncementCategory, AnnouncementWithDetails } from '../../types';

interface CreateAnnouncementData {
  groupId: string;
  authorId: string;
  title: string;
  content: string;
  category?: AnnouncementCategory;
  isPinned?: boolean;
  scheduledFor?: string;
  bypassMute?: boolean;
  crossGroupIds?: string[];
}

// ============================================
// ANNOUNCEMENT CRUD
// ============================================

/**
 * Create a new announcement
 */
export const createAnnouncement = async (data: CreateAnnouncementData): Promise<Announcement | null> => {
  if (!supabase) return null;

  const isScheduled = data.scheduledFor && new Date(data.scheduledFor) > new Date();

  const announcementData: any = {
    group_id: data.groupId,
    author_id: data.authorId,
    title: data.title,
    content: data.content,
    category: data.category || 'info',
    is_pinned: data.isPinned ?? false,
    scheduled_for: data.scheduledFor || null,
    is_published: !isScheduled,
    bypass_mute: data.bypassMute ?? false,
    cross_group_ids: data.crossGroupIds || null,
  };

  const { data: announcement, error } = await supabase
    .from('announcements')
    // @ts-ignore - Table may not exist yet
    .insert(announcementData)
    .select()
    .single();

  if (error) {
    console.error('Error creating announcement:', error);
    return null;
  }

  // Create cross-group copies if specified
  if (data.crossGroupIds && data.crossGroupIds.length > 0 && announcement) {
    for (const targetGroupId of data.crossGroupIds) {
      await supabase
        .from('announcements')
        // @ts-ignore
        .insert({
          ...announcementData,
          group_id: targetGroupId,
          cross_group_ids: null, // Don't cascade cross-posting
        });
    }
  }

  return announcement as unknown as Announcement;
};

/**
 * Get announcements for a group
 */
export const getGroupAnnouncements = async (
  groupId: string,
  limit: number = 50
): Promise<AnnouncementWithDetails[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('announcements')
    // @ts-ignore
    .select('*, author:users!author_id(display_name, avatar_emoji)')
    .eq('group_id', groupId)
    .eq('is_published', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }

  return (data || []) as unknown as AnnouncementWithDetails[];
};

/**
 * Get a single announcement by ID with read/acknowledgment counts
 */
export const getAnnouncementById = async (
  announcementId: string,
  userId?: string
): Promise<AnnouncementWithDetails | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('announcements')
    // @ts-ignore
    .select('*, author:users!author_id(display_name, avatar_emoji)')
    .eq('id', announcementId)
    .single();

  if (error) {
    console.error('Error fetching announcement:', error);
    return null;
  }

  // Get read/acknowledgment counts
  const { data: receipts } = await supabase
    .from('announcement_receipts')
    // @ts-ignore
    .select('*')
    .eq('announcement_id', announcementId);

  const readCount = (receipts || []).filter((r: any) => r.read_at).length;
  const acknowledgedCount = (receipts || []).filter((r: any) => r.acknowledged_at).length;

  // Check if current user has read/acknowledged
  let userRead = false;
  let userAcknowledged = false;
  if (userId) {
    const userReceipt = (receipts || []).find((r: any) => r.user_id === userId);
    userRead = !!(userReceipt as any)?.read_at;
    userAcknowledged = !!(userReceipt as any)?.acknowledged_at;
  }

  return {
    ...(data as any),
    read_count: readCount,
    acknowledged_count: acknowledgedCount,
    user_read: userRead,
    user_acknowledged: userAcknowledged,
  } as unknown as AnnouncementWithDetails;
};

/**
 * Update an announcement
 */
export const updateAnnouncement = async (
  announcementId: string,
  updates: Partial<Pick<Announcement, 'title' | 'content' | 'category' | 'is_pinned' | 'bypass_mute'>>
): Promise<Announcement | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('announcements')
    // @ts-ignore
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', announcementId)
    .select()
    .single();

  if (error) {
    console.error('Error updating announcement:', error);
    return null;
  }

  return data as unknown as Announcement;
};

/**
 * Delete an announcement
 */
export const deleteAnnouncement = async (announcementId: string): Promise<boolean> => {
  if (!supabase) return false;

  // Delete receipts first
  await supabase.from('announcement_receipts').delete().eq('announcement_id', announcementId);

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId);

  if (error) {
    console.error('Error deleting announcement:', error);
    return false;
  }

  return true;
};

// ============================================
// READ RECEIPTS & ACKNOWLEDGMENTS
// ============================================

/**
 * Mark an announcement as read
 */
export const markAnnouncementRead = async (
  announcementId: string,
  userId: string
): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('announcement_receipts')
    // @ts-ignore
    .upsert(
      {
        announcement_id: announcementId,
        user_id: userId,
        read_at: new Date().toISOString(),
      },
      { onConflict: 'announcement_id,user_id' }
    );

  if (error) {
    console.error('Error marking announcement read:', error);
    return false;
  }

  return true;
};

/**
 * Acknowledge an announcement (explicit confirmation)
 */
export const acknowledgeAnnouncement = async (
  announcementId: string,
  userId: string
): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('announcement_receipts')
    // @ts-ignore
    .upsert(
      {
        announcement_id: announcementId,
        user_id: userId,
        read_at: new Date().toISOString(),
        acknowledged_at: new Date().toISOString(),
      },
      { onConflict: 'announcement_id,user_id' }
    );

  if (error) {
    console.error('Error acknowledging announcement:', error);
    return false;
  }

  return true;
};

/**
 * Get read receipts for an announcement
 */
export const getAnnouncementReceipts = async (announcementId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('announcement_receipts')
    // @ts-ignore
    .select('*, user:users!user_id(display_name, username, avatar_emoji)')
    .eq('announcement_id', announcementId)
    .order('read_at', { ascending: false });

  if (error) {
    console.error('Error fetching receipts:', error);
    return [];
  }

  return data || [];
};

// ============================================
// SCHEDULED ANNOUNCEMENTS
// ============================================

/**
 * Get scheduled announcements that need to be published
 */
export const getScheduledAnnouncements = async (groupId: string): Promise<Announcement[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('announcements')
    // @ts-ignore
    .select('*')
    .eq('group_id', groupId)
    .eq('is_published', false)
    .order('scheduled_for', { ascending: true });

  if (error) {
    console.error('Error fetching scheduled announcements:', error);
    return [];
  }

  return (data || []) as unknown as Announcement[];
};

/**
 * Publish a scheduled announcement
 */
export const publishAnnouncement = async (announcementId: string): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('announcements')
    // @ts-ignore
    .update({
      is_published: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', announcementId);

  if (error) {
    console.error('Error publishing announcement:', error);
    return false;
  }

  return true;
};

/**
 * Get unread announcement count for a user in a group
 */
export const getUnreadAnnouncementCount = async (
  groupId: string,
  userId: string
): Promise<number> => {
  if (!supabase) return 0;

  // Get all published announcements
  const { data: announcements } = await supabase
    .from('announcements')
    // @ts-ignore
    .select('id')
    .eq('group_id', groupId)
    .eq('is_published', true);

  if (!announcements || announcements.length === 0) return 0;

  // Get user's read receipts
  const { data: receipts } = await supabase
    .from('announcement_receipts')
    // @ts-ignore
    .select('announcement_id')
    .eq('user_id', userId)
    .in('announcement_id', announcements.map((a: any) => a.id));

  const readIds = new Set((receipts || []).map((r: any) => r.announcement_id));
  return announcements.filter((a: any) => !readIds.has(a.id)).length;
};

// ============================================
// CATEGORY HELPERS
// ============================================

/**
 * Get display properties for announcement categories
 */
export const ANNOUNCEMENT_CATEGORIES: Record<AnnouncementCategory, {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
}> = {
  urgent: {
    label: 'Urgent',
    emoji: '🚨',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
  },
  info: {
    label: 'Info',
    emoji: 'ℹ️',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  reminder: {
    label: 'Reminder',
    emoji: '⏰',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
  celebration: {
    label: 'Celebration',
    emoji: '🎉',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
};
