import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

type RealtimeCallback = (payload: any) => void;

/**
 * Subscribe to new messages for a user
 */
export const subscribeToMessages = (userId: string, callback: RealtimeCallback): RealtimeChannel | null => {
  if (!supabase) return null;

  const subscription = supabase
    .channel('messages')
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
    .channel(`group_messages:${groupId}`)
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
    .subscribe();

  return subscription;
};

/**
 * Subscribe to server channel messages
 */
export const subscribeToChannelMessages = (channelId: string, callback: RealtimeCallback): RealtimeChannel | null => {
  if (!supabase) return null;

  const subscription = supabase
    .channel(`channel_messages:${channelId}`)
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
    .subscribe();

  return subscription;
};

/**
 * Subscribe to message reactions for real-time updates
 */
export const subscribeToMessageReactions = (callback: RealtimeCallback): RealtimeChannel | null => {
  if (!supabase) return null;

  const subscription = supabase
    .channel('message_reactions')
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
