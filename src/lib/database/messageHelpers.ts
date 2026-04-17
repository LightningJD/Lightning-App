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
 *
 * For DM reactions (`message_reactions`), also fires a `message_reaction`
 * notification to the message author. Group/channel reactions are left
 * alone intentionally — a single group message with many reactors would
 * flood the author's inbox, and those surfaces have other notification
 * paths (mentions, channel settings) better suited to that fan-out.
 * The notification insert is best-effort and does NOT roll back the
 * reaction on failure.
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

  // Best-effort notification on DM reactions (BUG-J). Fire-and-forget —
  // a failed notification must not fail the reaction write.
  if (table === 'message_reactions') {
    void (async () => {
      if (!supabase) return;
      try {
        const [{ data: msgRow }, { data: reactorRow }] = await Promise.all([
          (supabase as any).from('messages').select('sender_id').eq('id', messageId).maybeSingle(),
          (supabase as any).from('users').select('display_name, username').eq('id', userId).maybeSingle(),
        ]);

        const authorId = (msgRow as any)?.sender_id as string | undefined;
        if (!authorId || authorId === userId) return; // no self-notify

        const reactorName =
          (reactorRow as any)?.display_name ||
          (reactorRow as any)?.username ||
          'Someone';

        const { error: notifErr } = await (supabase as any)
          .from('notifications')
          .insert({
            user_id: authorId,
            type: 'message_reaction',
            title: 'New Reaction',
            content: `${reactorName} reacted ${emoji} to your message`,
            link: `/messages/${userId}`,
            is_read: false,
          });
        if (notifErr) console.warn('message_reaction notification insert failed:', notifErr);
      } catch (e) {
        console.warn('message_reaction notification fire-and-forget error:', e);
      }
    })();
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
