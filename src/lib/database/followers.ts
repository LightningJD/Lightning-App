/**
 * Followers System
 * Handles follow/unfollow for public profiles
 */

import { supabase } from '../supabase';

// ============================================
// FOLLOW OPERATIONS
// ============================================

/**
 * Follow a user (for public profiles)
 */
export const followUser = async (followerId: string, followingId: string): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Database not initialized' };

  if (followerId === followingId) {
    return { success: false, error: 'Cannot follow yourself' };
  }

  // Only allow following public profiles
  const { data: targetUser } = await supabase
    .from('users')
    .select('profile_visibility')
    .eq('id', followingId)
    .single();

  if ((targetUser as any)?.profile_visibility !== 'public') {
    return { success: false, error: 'This user has a private profile' };
  }

  const { error } = await (supabase as any)
    .from('followers')
    .insert({
      follower_id: followerId,
      following_id: followingId
    });

  if (error) {
    if (error.code === '23505') {
      return { success: true }; // Already following
    }
    console.error('Error following user:', error);
    return { success: false, error: 'Failed to follow user' };
  }

  return { success: true };
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (followerId: string, followingId: string): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Database not initialized' };

  const { error } = await (supabase as any)
    .from('followers')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) {
    console.error('Error unfollowing user:', error);
    return { success: false, error: 'Failed to unfollow user' };
  }

  return { success: true };
};

/**
 * Get users following this person
 */
export const getFollowers = async (userId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await (supabase as any)
    .from('followers')
    .select(`
      id,
      created_at,
      follower:users!follower_id (
        id,
        username,
        display_name,
        avatar_emoji,
        avatar_url,
        is_online,
        bio
      )
    `)
    .eq('following_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching followers:', error);
    return [];
  }

  return (data || []).map((f: any) => f.follower).filter(Boolean);
};

/**
 * Get users this person follows
 */
export const getFollowing = async (userId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await (supabase as any)
    .from('followers')
    .select(`
      id,
      created_at,
      following:users!following_id (
        id,
        username,
        display_name,
        avatar_emoji,
        avatar_url,
        is_online,
        bio
      )
    `)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching following:', error);
    return [];
  }

  return (data || []).map((f: any) => f.following).filter(Boolean);
};

/**
 * Check if user is following another user
 */
export const isFollowing = async (followerId: string, followingId: string): Promise<boolean> => {
  if (!supabase) return false;

  const { data, error } = await (supabase as any)
    .from('followers')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .limit(1);

  if (error) {
    console.error('Error checking follow status:', error);
    return false;
  }

  return data && data.length > 0;
};

/**
 * Get follower count for a user
 */
export const getFollowerCount = async (userId: string): Promise<number> => {
  if (!supabase) return 0;

  const { count, error } = await (supabase as any)
    .from('followers')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', userId);

  if (error) {
    console.error('Error getting follower count:', error);
    return 0;
  }

  return count || 0;
};

/**
 * Get following count for a user
 */
export const getFollowingCount = async (userId: string): Promise<number> => {
  if (!supabase) return 0;

  const { count, error } = await (supabase as any)
    .from('followers')
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', userId);

  if (error) {
    console.error('Error getting following count:', error);
    return 0;
  }

  return count || 0;
};
