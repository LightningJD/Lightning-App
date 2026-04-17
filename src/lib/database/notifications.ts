import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Notification row — shape of `public.notifications` as used by the app.
 *
 * Columns reflect the live DB schema (verified via information_schema):
 *   id, user_id, type, title, content, link, is_read, created_at
 *
 * Inserters in this codebase:
 *   - friends.ts        → type: 'friend_accepted'
 *   - messages.ts       → type: 'message'
 *   - groups.ts         → type: 'group_invite'
 */
export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  content: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ============================================
// READ
// ============================================

/**
 * Fetch a user's notifications, newest first.
 *
 * RLS policy `notifications_select` enforces `user_id = get_user_id()` so
 * passing the wrong userId returns zero rows regardless of what is asked for.
 * We still filter on `user_id` explicitly for clarity and so the query plan
 * uses the (user_id, created_at) path.
 */
export const getUserNotifications = async (
  userId: string,
  limit: number = 50,
): Promise<AppNotification[]> => {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, content, link, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error loading notifications:', error);
    return [];
  }

  return (data as unknown as AppNotification[]) || [];
};

/**
 * Count unread notifications for a user — used to badge the bell.
 */
export const getUnreadNotificationCount = async (
  userId: string,
): Promise<number> => {
  if (!supabase || !userId) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }

  return count || 0;
};

// ============================================
// WRITE
// ============================================

/**
 * Mark a single notification as read.
 */
export const markNotificationRead = async (
  notificationId: string,
): Promise<boolean> => {
  if (!supabase || !notificationId) return false;

  const { error } = await supabase
    .from('notifications')
    // @ts-ignore - Supabase generated types are incomplete for this table
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }

  return true;
};

/**
 * Mark every unread notification for `userId` as read.
 */
export const markAllNotificationsRead = async (
  userId: string,
): Promise<boolean> => {
  if (!supabase || !userId) return false;

  const { error } = await supabase
    .from('notifications')
    // @ts-ignore - Supabase generated types are incomplete for this table
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }

  return true;
};

// ============================================
// REALTIME
// ============================================

let _notifChannelCounter = 0;
const uniqueNotifChannel = (userId: string): string =>
  `notifications:${userId}:${++_notifChannelCounter}:${Date.now()}`;

/**
 * Subscribe to new notifications for a user.
 *
 * INSERT-only — filtered to `user_id=eq.{userId}` so other users' rows
 * are never streamed to this client (and RLS prevents it anyway).
 *
 * Returns the RealtimeChannel so the caller can pass it to `unsubscribe`.
 */
export const subscribeToNotifications = (
  userId: string,
  callback: (notification: AppNotification) => void,
): RealtimeChannel | null => {
  if (!supabase || !userId) return null;

  const channel = supabase
    .channel(uniqueNotifChannel(userId))
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        if (payload?.new) callback(payload.new as AppNotification);
      },
    )
    .subscribe((status, err) => {
      if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        console.warn(
          `📡 Notifications subscription ${status}, will retry on next mount.`,
        );
      }
      if (err) console.error('📡 Notifications subscription error:', err);
    });

  return channel;
};
