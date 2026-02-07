/**
 * Privacy & Permission Helper Functions
 * Church-aware visibility checks for testimonies, profiles, and messaging
 */

import { supabase } from '../supabase';

/**
 * Check if current user can view another user's testimony
 * Uses church-based visibility + friendship + follower logic
 */
export const canViewTestimony = async (testimonyOwnerId: string, currentUserId: string): Promise<boolean> => {
  if (!supabase) return false;

  // Can always view own testimony
  if (testimonyOwnerId === currentUserId) return true;

  // Get testimony visibility and owner's church_id
  const { data: testimony } = await (supabase as any)
    .from('testimonies')
    .select('visibility, user_id')
    .eq('user_id', testimonyOwnerId)
    .limit(1)
    .single();

  if (!testimony) return false;

  const visibility = testimony.visibility || 'my_church';

  // Shareable — visible to everyone
  if (visibility === 'shareable') return true;

  // Get both users' church IDs
  const { data: ownerData } = await supabase
    .from('users')
    .select('church_id')
    .eq('id', testimonyOwnerId)
    .single();

  const { data: viewerData } = await supabase
    .from('users')
    .select('church_id')
    .eq('id', currentUserId)
    .single();

  const ownerChurchId = (ownerData as any)?.church_id;
  const viewerChurchId = (viewerData as any)?.church_id;
  const sameChurch = ownerChurchId && viewerChurchId && ownerChurchId === viewerChurchId;

  // My Church — only same church members
  if (visibility === 'my_church') {
    return sameChurch;
  }

  // All Churches — same church, friends, or followers (if public)
  if (visibility === 'all_churches') {
    if (sameChurch) return true;

    // Check friendship
    const { data: friendship } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id_1.eq.${currentUserId},user_id_2.eq.${testimonyOwnerId}),and(user_id_1.eq.${testimonyOwnerId},user_id_2.eq.${currentUserId})`)
      .eq('status', 'accepted')
      .limit(1);

    if (friendship && friendship.length > 0) return true;

    // Check if viewer follows this user (for public profiles)
    const { data: follow } = await (supabase as any)
      .from('followers')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', testimonyOwnerId)
      .limit(1);

    if (follow && follow.length > 0) return true;

    return false;
  }

  return false;
};

/**
 * Check if current user can send a message to another user
 * Allows: friends, same-church members (based on message_privacy setting)
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
    .select('message_privacy, church_id')
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

    case 'friends': {
      // Check if users are friends
      const { data: friendship } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id_1.eq.${senderId},user_id_2.eq.${recipientId}),and(user_id_1.eq.${recipientId},user_id_2.eq.${senderId})`)
        .eq('status', 'accepted')
        .limit(1);

      if (friendship && friendship.length > 0) {
        return { allowed: true };
      }

      // Also allow same-church members
      const recipientChurchId = (recipient as any).church_id;
      if (recipientChurchId) {
        const { data: sender } = await supabase
          .from('users')
          .select('church_id')
          .eq('id', senderId)
          .single();

        if ((sender as any)?.church_id === recipientChurchId) {
          return { allowed: true };
        }
      }

      return { allowed: false, reason: 'This user only accepts messages from friends and church members' };
    }

    case 'none':
      return { allowed: false, reason: 'This user has disabled messages' };

    default:
      return { allowed: true };
  }
};

/**
 * Check if a user's profile is visible to the current user
 * Private profiles: visible to friends + same-church members
 * Public profiles: visible to everyone
 */
export const isUserVisible = async (userId: string, currentUserId: string): Promise<boolean> => {
  if (!supabase) return false;

  // Always visible to self
  if (userId === currentUserId) return true;

  // Get user's privacy settings
  const { data: user, error } = await supabase
    .from('users')
    .select('profile_visibility, church_id')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.error('Error checking user visibility:', error);
    return false;
  }

  const visibility = (user as any).profile_visibility || 'public';

  // Public profiles visible to everyone
  if (visibility === 'public') return true;

  // Private: check same church
  const targetChurchId = (user as any).church_id;
  if (targetChurchId) {
    const { data: viewer } = await supabase
      .from('users')
      .select('church_id')
      .eq('id', currentUserId)
      .single();

    if ((viewer as any)?.church_id === targetChurchId) return true;
  }

  // Private: check friendship
  if (!currentUserId) return false;

  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .or(`and(user_id_1.eq.${currentUserId},user_id_2.eq.${userId}),and(user_id_1.eq.${userId},user_id_2.eq.${currentUserId})`)
    .eq('status', 'accepted')
    .limit(1);

  return friendship && friendship.length > 0;
};

export default {
  canViewTestimony,
  canSendMessage,
  isUserVisible
};
