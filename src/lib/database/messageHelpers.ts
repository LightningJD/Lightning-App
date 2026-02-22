/**
 * Shared message helpers for operations identical across table types:
 * - Pinning/unpinning (group_messages, channel_messages)
 * - Reactions (message_reactions, channel_message_reactions)
 */
import { supabase } from '../supabase';

/**
 * Pin a message in the given table.
 */
export const pinMessageInTable = async (
  table: string,
  messageId: string,
  userId: string
): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await (supabase as any)
    .from(table)
    .update({
      is_pinned: true,
      pinned_by: userId,
      pinned_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    console.error(`Error pinning message in ${table}:`, error);
    return null;
  }

  return data;
};

/**
 * Unpin a message in the given table.
 */
export const unpinMessageInTable = async (
  table: string,
  messageId: string
): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await (supabase as any)
    .from(table)
    .update({
      is_pinned: false,
      pinned_by: null,
      pinned_at: null
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    console.error(`Error unpinning message in ${table}:`, error);
    return null;
  }

  return data;
};

/**
 * Get pinned messages from the given table, filtered by a parent ID column.
 */
export const getPinnedMessagesFromTable = async (
  table: string,
  parentColumn: string,
  parentId: string,
  senderSelect: string = '*, sender:users!sender_id(username, display_name, avatar_emoji)'
): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await (supabase as any)
    .from(table)
    .select(senderSelect)
    .eq(parentColumn, parentId)
    .eq('is_pinned', true)
    .order('pinned_at', { ascending: false });

  if (error) {
    console.error(`Error fetching pinned messages from ${table}:`, error);
    return [];
  }

  return data;
};

// ============================================
// REACTION HELPERS
// ============================================

/**
 * Add a reaction in the given reactions table.
 */
export const addReactionToTable = async (
  table: string,
  messageId: string,
  userId: string,
  emoji: string
): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await (supabase as any)
    .from(table)
    .insert({
      message_id: messageId,
      user_id: userId,
      emoji
    })
    .select()
    .single();

  if (error) {
    // If reaction already exists, ignore (unique constraint)
    if (error.code === '23505') {
      return null;
    }
    console.error(`Error adding reaction in ${table}:`, error);
    return null;
  }

  return data;
};

/**
 * Remove a reaction from the given reactions table.
 */
export const removeReactionFromTable = async (
  table: string,
  messageId: string,
  userId: string,
  emoji: string
): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await (supabase as any)
    .from(table)
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);

  if (error) {
    console.error(`Error removing reaction in ${table}:`, error);
    return null;
  }

  return true;
};

/**
 * Get all reactions for a message from the given reactions table.
 */
export const getReactionsFromTable = async (
  table: string,
  messageId: string,
  userSelect: string = '*, user:users!user_id(id, display_name, avatar_emoji)'
): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await (supabase as any)
    .from(table)
    .select(userSelect)
    .eq('message_id', messageId);

  if (error) {
    console.error(`Error fetching reactions from ${table}:`, error);
    return [];
  }

  return data;
};
