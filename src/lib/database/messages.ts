import { supabase } from '../supabase';

// ============================================
// MESSAGE OPERATIONS
// ============================================

/**
 * Send a direct message
 */
export const sendMessage = async (senderId: string, recipientId: string, content: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('messages')
    // @ts-ignore - Supabase generated types are incomplete
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      content
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  return data;
};

/**
 * Get conversation between two users
 */
export const getConversation = async (userId1: string, userId2: string, limit: number = 50): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('messages')
    // @ts-ignore - Supabase generated types don't handle nested relations
    .select('*, sender:users!sender_id(username, display_name, avatar_emoji)')
    .or(`and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching conversation:', error);
    return [];
  }

  return data;
};

/**
 * Get all conversations for a user (list of recent chats)
 */
export const getUserConversations = async (userId: string): Promise<any[]> => {
  if (!supabase) return [];

  // Get all messages where user is either sender or recipient
  const { data, error } = await supabase
    .from('messages')
    // @ts-ignore - Supabase generated types don't handle nested relations
    .select('*, sender:users!sender_id(id, username, display_name, avatar_emoji, avatar_url, is_online), recipient:users!recipient_id(id, username, display_name, avatar_emoji, avatar_url, is_online)')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }

  // Group messages by conversation partner
  const conversationsMap = new Map<string, any>();

  (data as any[]).forEach((msg: any) => {
    // Determine the other user in the conversation
    const otherUser = msg.sender_id === userId ? msg.recipient : msg.sender;
    const otherUserId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;

    if (!conversationsMap.has(otherUserId)) {
      conversationsMap.set(otherUserId, {
        id: otherUserId,
        userId: otherUserId,
        name: otherUser.display_name,
        username: otherUser.username,
        avatar: otherUser.avatar_emoji,
        avatarImage: otherUser.avatar_url,
        online: otherUser.is_online,
        lastMessage: msg.content,
        timestamp: msg.created_at,
        unreadCount: 0
      });
    }
  });

  return Array.from(conversationsMap.values()).sort((a: any, b: any) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (messageId: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('messages')
    // @ts-ignore - Supabase generated types don't allow update on this table
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', messageId);

  if (error) {
    console.error('Error marking message as read:', error);
    return null;
  }

  return data;
};

// ============================================
// MESSAGE REACTIONS
// ============================================

/**
 * Add reaction to message
 */
export const addReaction = async (messageId: string, userId: string, emoji: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('message_reactions')
    // @ts-ignore - Supabase generated types are incomplete
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
      console.log('Reaction already exists');
      return null;
    }
    console.error('Error adding reaction:', error);
    return null;
  }

  return data;
};

/**
 * Remove reaction from message
 */
export const removeReaction = async (messageId: string, userId: string, emoji: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);

  if (error) {
    console.error('Error removing reaction:', error);
    return null;
  }

  return true;
};

/**
 * Get reactions for a message
 */
export const getMessageReactions = async (messageId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('message_reactions')
    // @ts-ignore - Supabase generated types don't handle nested relations
    .select('*, user:users!user_id(id, display_name, avatar_emoji)')
    .eq('message_id', messageId);

  if (error) {
    console.error('Error fetching reactions:', error);
    return [];
  }

  return data;
};
