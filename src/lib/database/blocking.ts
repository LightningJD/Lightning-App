import { supabase } from '../supabase';

/**
 * Block a user
 * @param {string} blockerId - The ID of the user doing the blocking (current user)
 * @param {string} blockedId - The ID of the user being blocked
 * @param {string} reason - Optional reason for blocking
 * @returns {Promise<Object>} The created block record
 */
export const blockUser = async (blockerId, blockedId, reason = null) => {
  try {
    const { data, error } = await supabase
      .from('blocked_users')
      .insert({
        blocker_id: blockerId,
        blocked_id: blockedId,
        reason: reason
      })
      .select()
      .single();

    if (error) {
      console.error('Error blocking user:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in blockUser:', error);
    throw error;
  }
};

/**
 * Unblock a user
 * @param {string} blockerId - The ID of the user doing the unblocking (current user)
 * @param {string} blockedId - The ID of the user being unblocked
 * @returns {Promise<void>}
 */
export const unblockUser = async (blockerId, blockedId) => {
  try {
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in unblockUser:', error);
    throw error;
  }
};

/**
 * Get all users blocked by the current user
 * @param {string} blockerId - The ID of the user (current user)
 * @returns {Promise<Array>} Array of blocked users with their profile info
 */
export const getBlockedUsers = async (blockerId) => {
  try {
    const { data, error } = await supabase
      .from('blocked_users')
      .select(`
        id,
        blocked_id,
        blocked_at,
        reason,
        users!blocked_users_blocked_id_fkey (
          id,
          clerk_id,
          username,
          full_name,
          avatar_url,
          location_city
        )
      `)
      .eq('blocker_id', blockerId)
      .order('blocked_at', { ascending: false });

    if (error) {
      console.error('Error fetching blocked users:', error);
      throw error;
    }

    // Transform data to flatten user info
    const blockedUsers = (data || []).map(block => ({
      blockId: block.id,
      blockedAt: block.blocked_at,
      reason: block.reason,
      user: block.users
    }));

    return blockedUsers;
  } catch (error) {
    console.error('Error in getBlockedUsers:', error);
    throw error;
  }
};

/**
 * Check if a user is blocked
 * @param {string} blockerId - The ID of the user (current user)
 * @param {string} blockedId - The ID of the user to check
 * @returns {Promise<boolean>} True if blocked, false otherwise
 */
export const isUserBlocked = async (blockerId, blockedId) => {
  try {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .maybeSingle();

    if (error) {
      console.error('Error checking if user is blocked:', error);
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error in isUserBlocked:', error);
    return false;
  }
};

/**
 * Check if current user is blocked by another user
 * @param {string} userId - The ID of the user to check (current user)
 * @param {string} potentialBlockerId - The ID of the user who might have blocked us
 * @returns {Promise<boolean>} True if we are blocked by them, false otherwise
 */
export const isBlockedBy = async (userId, potentialBlockerId) => {
  try {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', potentialBlockerId)
      .eq('blocked_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking if blocked by user:', error);
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error in isBlockedBy:', error);
    return false;
  }
};
