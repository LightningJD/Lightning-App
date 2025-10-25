/**
 * Privacy & Permission Helper Functions
 * Checks user privacy settings before displaying content
 */

import { supabase } from '../supabase';

/**
 * Check if current user can view another user's testimony
 * @param testimonyOwnerId - UUID of testimony owner
 * @param currentUserId - UUID of current viewing user
 * @returns Promise<boolean>
 */
export const canViewTestimony = async (testimonyOwnerId: string, currentUserId: string): Promise<boolean> => {
  if (!supabase) return false;

  // Can always view own testimony
  if (testimonyOwnerId === currentUserId) return true;

  // Get testimony owner's privacy settings
  const { data: owner, error } = await supabase
    .from('users')
    .select('testimony_visibility')
    .eq('id', testimonyOwnerId)
    .single();

  if (error || !owner) {
    console.error('Error checking testimony visibility:', error);
    return false;
  }

  const visibility = (owner as any).testimony_visibility || 'everyone';

  // Check visibility setting
  switch (visibility) {
    case 'everyone':
      return true;

    case 'friends':
      // Check if users are friends
      if (!currentUserId) return false;

      const { data: friendship, error: friendError } = await supabase
        .from('friends')
        .select('id')
        .or(`user_id.eq.${currentUserId},user_id.eq.${testimonyOwnerId}`)
        .or(`friend_id.eq.${currentUserId},friend_id.eq.${testimonyOwnerId}`)
        .eq('status', 'accepted')
        .limit(1);

      if (friendError) {
        console.error('Error checking friendship:', friendError);
        return false;
      }

      return friendship && friendship.length > 0;

    case 'private':
      return false;

    default:
      return true;
  }
};

/**
 * Check if current user can send a message to another user
 * @param recipientId - UUID of message recipient
 * @param senderId - UUID of message sender
 * @returns Promise<{allowed: boolean, reason?: string}>
 */
export const canSendMessage = async (recipientId: string, senderId: string): Promise<{ allowed: boolean; reason?: string }> => {
  if (!supabase) return { allowed: false, reason: 'Database unavailable' };

  // Can't message yourself
  if (recipientId === senderId) {
    return { allowed: false, reason: 'Cannot message yourself' };
  }

  // Get recipient's privacy settings
  const { data: recipient, error } = await supabase
    .from('users')
    .select('message_privacy')
    .eq('id', recipientId)
    .single();

  if (error || !recipient) {
    console.error('Error checking message privacy:', error);
    return { allowed: false, reason: 'Unable to verify permissions' };
  }

  const privacy = (recipient as any).message_privacy || 'everyone';

  // Check privacy setting
  switch (privacy) {
    case 'everyone':
      return { allowed: true };

    case 'friends':
      // Check if users are friends
      const { data: friendship, error: friendError } = await supabase
        .from('friends')
        .select('id')
        .or(`user_id.eq.${senderId},user_id.eq.${recipientId}`)
        .or(`friend_id.eq.${senderId},friend_id.eq.${recipientId}`)
        .eq('status', 'accepted')
        .limit(1);

      if (friendError) {
        console.error('Error checking friendship:', friendError);
        return { allowed: false, reason: 'Unable to verify friendship' };
      }

      if (!friendship || friendship.length === 0) {
        return { allowed: false, reason: 'This user only accepts messages from friends' };
      }

      return { allowed: true };

    case 'none':
      return { allowed: false, reason: 'This user has disabled messages' };

    default:
      return { allowed: true };
  }
};

/**
 * Check if a user is visible (not private or is a friend)
 * @param userId - UUID of user to check
 * @param currentUserId - UUID of current viewing user
 * @returns Promise<boolean>
 */
export const isUserVisible = async (userId: string, currentUserId: string): Promise<boolean> => {
  if (!supabase) return false;

  // Get user's privacy settings
  const { data: user, error } = await supabase
    .from('users')
    .select('is_private')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.error('Error checking user visibility:', error);
    return false;
  }

  // If not private, visible to everyone
  if (!(user as any).is_private) return true;

  // If private, check if current user is a friend
  if (!currentUserId) return false;

  const { data: friendship, error: friendError } = await supabase
    .from('friends')
    .select('id')
    .or(`user_id.eq.${currentUserId},user_id.eq.${userId}`)
    .or(`friend_id.eq.${currentUserId},friend_id.eq.${userId}`)
    .eq('status', 'accepted')
    .limit(1);

  if (friendError) {
    console.error('Error checking friendship:', friendError);
    return false;
  }

  return friendship && friendship.length > 0;
};

export default {
  canViewTestimony,
  canSendMessage,
  isUserVisible
};
