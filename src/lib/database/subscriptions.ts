import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

type RealtimeCallback = (payload: any) => void;

/**
 * Generate a unique channel name to avoid collisions.
 *
 * Why: Supabase Realtime requires unique channel names. When React
 * StrictMode double-fires effects (or when deps change), the cleanup
 * removes the old channel. If the new subscription uses the SAME name
 * before cleanup finishes, Supabase sees a duplicate and immediately
 * closes the channel (SUBSCRIBED → CLOSED in logs).
 *
 * Fix: append a random suffix so each subscription gets a unique name.
 */
let _channelCounter = 0;
const uniqueChannel = (base: string): string => `${base}:${++_channelCounter}:${Date.now()}`;

/**
 * Subscribe to new messages for a user
 */
export const subscribeToMessages = (userId: string, callback: RealtimeCallback): RealtimeChannel | null => {
  if (!supabase) return null;

  const subscription = supabase
    .channel(uniqueChannel(`messages:${userId}`))
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`
      },
      callback
    )
    .subscribe();

  return subscription;
};

/**
 * Subscribe to group messages
 */
export const subscribeToGroupMessages = (groupId: string, callback: RealtimeCallback): RealtimeChannel | null => {
  if (!supabase) return null;

  const subscription = supabase
    .channel(uniqueChannel(`group_messages:${groupId}`))
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`
      },
      callback
    )
    .subscribe((status, err) => {
      if (err) console.error('📡 Group messages subscription error:', err);
    });

  return subscription;
};

/**
 * Subscribe to server channel messages
 */
export const subscribeToChannelMessages = (channelId: string, callback: RealtimeCallback): RealtimeChannel | null => {
  if (!supabase) return null;

  const subscription = supabase
    .channel(uniqueChannel(`channel_messages:${channelId}`))
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'channel_messages',
        filter: `channel_id=eq.${channelId}`
      },
      callback
    )
    .subscribe((status, err) => {
      if (err) console.error('📡 Channel messages subscription error:', err);
    });

  return subscription;
};

/**
 * Subscribe to message reactions for real-time updates
 */
export const subscribeToMessageReactions = (callback: RealtimeCallback): RealtimeChannel | null => {
  if (!supabase) return null;

  const subscription = supabase
    .channel(uniqueChannel('message_reactions'))
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'message_reactions'
      },
      callback
    )
    .subscribe();

  return subscription;
};

/**
 * Unsubscribe from a channel
 */
export const unsubscribe = async (subscription: RealtimeChannel): Promise<void> => {
  if (!supabase || !subscription) return;
  await supabase.removeChannel(subscription);
};
