import { supabase } from '../supabase';

// ============================================
// MESSAGE OPERATIONS
// ============================================

/**
 * Send a direct message
 */
export const sendMessage = async (senderId: string, recipientId: string, content: string, replyToMessageId?: string, imageUrl?: string): Promise<{ data: any; error: null } | { data: null; error: string }> => {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return { data: null, error: 'Database not initialized' };
  }

  const insertPayload: any = {
    sender_id: senderId,
    recipient_id: recipientId,
    content
  };

  // Include reply_to_message_id if provided (for threaded replies)
  if (replyToMessageId) {
    insertPayload.reply_to_message_id = replyToMessageId;
  }

  // Include image_url if provided (for image sharing)
  if (imageUrl) {
    insertPayload.image_url = imageUrl;
  }

  const { data, error } = await supabase
    .from('messages')
    // @ts-ignore - Supabase generated types are incomplete
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    const errorMessage = error.message || 'Failed to send message';
    // Log more details for debugging
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return { data: null, error: errorMessage };
  }

  // Create notification for the recipient
  try {
    // Get sender's display name for notification
    const { data: senderData } = await supabase
      .from('users')
      .select('display_name, username')
      .eq('id', senderId)
      .single();

    const senderName = senderData?.display_name || senderData?.username || 'Someone';

    // Only create notification if recipient has notifications enabled
    const { data: recipientData } = await supabase
      .from('users')
      .select('notify_messages')
      .eq('id', recipientId)
      .single();

    const recipientNotifyMessages = recipientData?.notify_messages !== false; // Default to true if null

    if (recipientNotifyMessages) {
      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        // @ts-ignore - Supabase generated types are incomplete
        .insert({
          user_id: recipientId,
          type: 'message',
          title: 'New Message',
          content: `${senderName} sent you a message`,
          link: `/messages/${senderId}`,
          is_read: false
        });

      if (notificationError) {
        console.error('Error creating message notification:', notificationError);
      } else {
        console.log('✅ Created message notification for recipient');
      }
    }
  } catch (notificationErr) {
    console.error('Error creating notification:', notificationErr);
    // Don't fail message send if notification creation fails
  }

  return { data, error: null };
};

/**
 * Delete a message (only by sender)
 */
export const deleteMessage = async (messageId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Database not initialized' };

  try {
    // First verify the message belongs to this user
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return { success: false, error: 'Message not found' };
    }

    if ((message as any).sender_id !== userId) {
      return { success: false, error: 'Unauthorized: You can only delete your own messages' };
    }

    // Delete the message
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', userId);

    if (deleteError) {
      console.error('Error deleting message:', deleteError);
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting message:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Get conversation between two users
 */
export const getConversation = async (userId1: string, userId2: string, limit: number = 50): Promise<any[]> => {
  if (!supabase) {
    console.warn('Supabase client not initialized - cannot fetch conversation');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      // @ts-ignore - Supabase generated types don't handle nested relations
      .select('*, sender:users!sender_id(username, display_name, avatar_emoji), reply_to:messages!reply_to_message_id(id, content, sender:users!sender_id(username, display_name, avatar_emoji))')
      .or(`and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching conversation:', error);
      if (error.message && error.message.includes('Failed to fetch')) {
        console.error('Supabase connection error - check your internet connection and Supabase configuration');
      }
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('Exception in getConversation:', error);
    if (error?.message && error.message.includes('Failed to fetch')) {
      console.error('Network/connection error - check Supabase configuration and internet connection');
    }
    return [];
  }
};

/**
 * Get all conversations for a user (list of recent chats)
 */
export const getUserConversations = async (userId: string): Promise<any[]> => {
  if (!supabase) {
    console.warn('Supabase client not initialized - cannot fetch conversations');
    return [];
  }

  try {
    // Get all messages where user is either sender or recipient
    const { data, error } = await supabase
      .from('messages')
      // @ts-ignore - Supabase generated types don't handle nested relations
      .select('*, sender:users!sender_id(id, username, display_name, avatar_emoji, avatar_url, is_online), recipient:users!recipient_id(id, username, display_name, avatar_emoji, avatar_url, is_online)')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      // Check if it's a connection error
      if (error.message && error.message.includes('Failed to fetch')) {
        console.error('Supabase connection error - check your internet connection and Supabase configuration');
      }
      return [];
    }

    if (!data) return [];

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
        unreadCount: 0,
        messages: [] // Store all messages for this conversation
      });
    }

    // Add message to conversation's messages array
    const conversation = conversationsMap.get(otherUserId);
    if (conversation) {
      conversation.messages.push(msg);
      // Update last message if this is more recent
      if (new Date(msg.created_at) > new Date(conversation.timestamp)) {
        conversation.lastMessage = msg.content;
        conversation.timestamp = msg.created_at;
      }
    }
  });

  // Calculate unread counts for each conversation
  const conversations = Array.from(conversationsMap.values());
  for (const conversation of conversations) {
    // Count unread messages where user is recipient
    const unreadMessages = conversation.messages.filter((msg: any) => 
      msg.recipient_id === userId && !msg.is_read
    );
    conversation.unreadCount = unreadMessages.length;
    // Remove messages array as we don't need it in the return value
    delete conversation.messages;
  }

    return conversations.sort((a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error: any) {
    console.error('Exception in getUserConversations:', error);
    // Return empty array on any exception to prevent app crash
    if (error?.message && error.message.includes('Failed to fetch')) {
      console.error('Network/connection error - check Supabase configuration and internet connection');
    }
    return [];
  }
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

/**
 * Mark all messages in a conversation as read
 */
export const markConversationAsRead = async (userId: string, otherUserId: string): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('messages')
    // @ts-ignore - Supabase generated types don't allow update on this table
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('recipient_id', userId)
    .eq('sender_id', otherUserId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking conversation as read:', error);
    return false;
  }

  return true;
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
