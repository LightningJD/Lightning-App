import { supabase } from '../supabase';

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to new messages for a user
 */
export const subscribeToMessages = (userId, callback) => {
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
export const subscribeToGroupMessages = (groupId, callback) => {
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
 * Unsubscribe from a channel
 */
export const unsubscribe = async (subscription) => {
  if (!supabase || !subscription) return;
  await supabase.removeChannel(subscription);
};
