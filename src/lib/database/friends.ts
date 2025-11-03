import { supabase } from '../supabase';
import type { Friend } from '../../types';

interface FriendWithUser {
  id: string;
  username: string;
  display_name: string;
  avatar_emoji?: string;
  avatar_url?: string;
  is_online?: boolean;
  bio?: string;
  location_city?: string;
}

interface FriendRequest extends Friend {
  sender?: FriendWithUser;
  recipient?: FriendWithUser;
  friend?: FriendWithUser;
}

// ============================================
// FRIENDSHIP OPERATIONS
// ============================================

/**
 * Send a friend request
 */
export const sendFriendRequest = async (fromUserId: string, toUserId: string): Promise<Friend | null> => {
  if (!supabase) return null;

  const insertData: any = {
    user_id_1: fromUserId,
    user_id_2: toUserId,
    status: 'pending',
    requested_by: fromUserId
  };

  const { data, error } = await supabase
    .from('friendships')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error sending friend request:', error);
    return null;
  }

  return data as Friend;
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (requestId: string): Promise<Friend | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('friendships')
    // @ts-ignore - Supabase generated types don't allow update on this table
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error('Error accepting friend request:', error);
    return null;
  }

  // Create reverse friendship (so both users are friends)
  const { user_id_1, user_id_2 } = data as any;
  const insertData: any = {
    user_id_1: user_id_2,
    user_id_2: user_id_1,
    status: 'accepted',
    requested_by: user_id_2
  };

  await supabase
    .from('friendships')
    .insert(insertData);

  return data as Friend;
};

/**
 * Decline a friend request
 */
export const declineFriendRequest = async (requestId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('friendships')
    // @ts-ignore - Supabase generated types don't allow update on this table
    .update({ status: 'declined' })
    .eq('id', requestId);

  if (error) {
    console.error('Error declining friend request:', error);
    return null;
  }

  return true;
};

/**
 * Get user's friends (accepted friendships)
 */
export const getFriends = async (userId: string): Promise<FriendWithUser[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('*, friend:users!user_id_2(id, username, display_name, avatar_emoji, avatar_url, is_online, bio, location_city)')
    .eq('user_id_1', userId)
    .eq('status', 'accepted');

  if (error) {
    console.error('Error fetching friends:', error);
    return [];
  }

  return (data as any[]).map((friendship: any) => friendship.friend).filter(Boolean);
};

/**
 * Get pending friend requests received by user
 */
export const getPendingFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('*, sender:users!user_id_1(id, username, display_name, avatar_emoji, avatar_url, is_online, bio)')
    .eq('user_id_2', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }

  return data as FriendRequest[];
};

/**
 * Get friend requests sent by user
 */
export const getSentFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('*, recipient:users!user_id_2(id, username, display_name, avatar_emoji)')
    .eq('user_id_1', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sent requests:', error);
    return [];
  }

  return data as FriendRequest[];
};

/**
 * Unfriend a user (remove both sides of friendship)
 */
export const unfriend = async (userId: string, friendId: string): Promise<boolean | null> => {
  if (!supabase) return null;

  // Delete both directions of the friendship
  await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id_1.eq.${userId},user_id_2.eq.${friendId}),and(user_id_1.eq.${friendId},user_id_2.eq.${userId})`);

  return true;
};

/**
 * Check friendship status between two users
 * Returns: null (no friendship), 'pending', 'accepted', 'rejected'
 */
export const checkFriendshipStatus = async (userId: string, friendId: string): Promise<'pending' | 'accepted' | 'rejected' | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('friendships')
    .select('status')
    .or(`and(user_id_1.eq.${userId},user_id_2.eq.${friendId}),and(user_id_1.eq.${friendId},user_id_2.eq.${userId})`)
    .single();

  if (error) {
    // No friendship exists
    return null;
  }

  return (data as any).status as 'pending' | 'accepted' | 'rejected';
};

/**
 * Get mutual friends between two users
 */
export const getMutualFriends = async (userId1: string, userId2: string): Promise<FriendWithUser[]> => {
  if (!supabase) return [];

  // Get user1's friends
  const { data: user1Friends, error: error1 } = await supabase
    .from('friendships')
    .select('user_id_2')
    .eq('user_id_1', userId1)
    .eq('status', 'accepted');

  if (error1) return [];

  // Get user2's friends
  const { data: user2Friends, error: error2 } = await supabase
    .from('friendships')
    .select('user_id_2')
    .eq('user_id_1', userId2)
    .eq('status', 'accepted');

  if (error2) return [];

  // Find intersection
  const user1FriendIds = new Set((user1Friends as any[]).map((f: any) => f.user_id_2));
  const mutualFriendIds = (user2Friends as any[])
    .filter((f: any) => user1FriendIds.has(f.user_id_2))
    .map((f: any) => f.user_id_2);

  if (mutualFriendIds.length === 0) return [];

  // Get user details for mutual friends
  const { data: mutualFriends, error: error3 } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_emoji, avatar_url')
    .in('id', mutualFriendIds);

  if (error3) return [];

  return mutualFriends as FriendWithUser[];
};
