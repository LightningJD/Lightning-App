import { supabase } from '../supabase';
import type { BlockedUser } from '../../types';

interface BlockedUserWithProfile {
  blockId: string;
  blockedAt: string;
  reason: string | null;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    location_city: string | null;
  } | null;
}

/**
 * Block a user
 * @param blockerId - The ID of the user doing the blocking (current user)
 * @param blockedId - The ID of the user being blocked
 * @param reason - Optional reason for blocking
 * @returns The created block record
 */
export const blockUser = async (blockerId: string, blockedId: string, reason: string | null = null): Promise<BlockedUser> => {
  try {
    if (!supabase) {
      throw new Error('Database unavailable');
    }

    const insertData: any = {
      blocker_id: blockerId,
      blocked_id: blockedId,
    };

    if (reason) {
      insertData.reason = reason;
    }

    const { data, error } = await supabase
      .from('blocked_users')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error blocking user:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in blockUser:', error instanceof Error ? error.message : error);
    throw error;
  }
};

/**
 * Unblock a user
 * @param blockerId - The ID of the user doing the unblocking (current user)
 * @param blockedId - The ID of the user being unblocked
 */
export const unblockUser = async (blockerId: string, blockedId: string): Promise<void> => {
  try {
    if (!supabase) {
      throw new Error('Database unavailable');
    }

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
    console.error('Error in unblockUser:', error instanceof Error ? error.message : error);
    throw error;
  }
};

/**
 * Get all users blocked by the current user
 * @param blockerId - The ID of the user (current user)
 * @returns Array of blocked users with their profile info
 */
export const getBlockedUsers = async (blockerId: string): Promise<BlockedUserWithProfile[]> => {
  try {
    if (!supabase) {
      throw new Error('Database unavailable');
    }

    const { data, error } = await supabase
      .from('blocked_users')
      .select(`
        id,
        blocked_id,
        blocked_at,
        reason,
        users!blocked_users_blocked_id_fkey (
          id,
          username,
          display_name,
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
    const blockedUsers = (data || []).map((block: any) => ({
      blockId: block.id,
      blockedAt: block.blocked_at,
      reason: block.reason,
      user: block.users
    }));

    return blockedUsers;
  } catch (error) {
    console.error('Error in getBlockedUsers:', error instanceof Error ? error.message : error);
    throw error;
  }
};

/**
 * Check if a user is blocked
 * @param blockerId - The ID of the user (current user)
 * @param blockedId - The ID of the user to check
 * @returns True if blocked, false otherwise
 */
export const isUserBlocked = async (blockerId: string, blockedId: string): Promise<boolean> => {
  try {
    if (!supabase) {
      throw new Error('Database unavailable');
    }

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
    console.error('Error in isUserBlocked:', error instanceof Error ? error.message : error);
    return false;
  }
};

/**
 * Check if current user is blocked by another user
 * @param userId - The ID of the user to check (current user)
 * @param potentialBlockerId - The ID of the user who might have blocked us
 * @returns True if we are blocked by them, false otherwise
 */
export const isBlockedBy = async (userId: string, potentialBlockerId: string): Promise<boolean> => {
  try {
    if (!supabase) {
      throw new Error('Database unavailable');
    }

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
    console.error('Error in isBlockedBy:', error instanceof Error ? error.message : error);
    return false;
  }
};
