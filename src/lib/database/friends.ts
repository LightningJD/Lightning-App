import { supabase } from '../supabase';

// ============================================
// FRIENDSHIP OPERATIONS
// ============================================

/**
 * Send a friend request
 */
export const sendFriendRequest = async (fromUserId, toUserId) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('friendships')
    .insert({
      user_id: fromUserId,
      friend_id: toUserId,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending friend request:', error);
    return null;
  }

  return data;
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (requestId) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error('Error accepting friend request:', error);
    return null;
  }

  // Create reverse friendship (so both users are friends)
  const { user_id, friend_id } = data;
  await supabase
    .from('friendships')
    .insert({
      user_id: friend_id,
      friend_id: user_id,
      status: 'accepted'
    });

  return data;
};

/**
 * Decline a friend request
 */
export const declineFriendRequest = async (requestId) => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('friendships')
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
export const getFriends = async (userId) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('*, friend:users!friend_id(id, username, display_name, avatar_emoji, avatar_url, is_online, bio, location_city)')
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (error) {
    console.error('Error fetching friends:', error);
    return [];
  }

  return data.map(friendship => friendship.friend);
};

/**
 * Get pending friend requests received by user
 */
export const getPendingFriendRequests = async (userId) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('*, sender:users!user_id(id, username, display_name, avatar_emoji, avatar_url, is_online, bio)')
    .eq('friend_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }

  return data;
};

/**
 * Get friend requests sent by user
 */
export const getSentFriendRequests = async (userId) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('*, recipient:users!friend_id(id, username, display_name, avatar_emoji)')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sent requests:', error);
    return [];
  }

  return data;
};

/**
 * Unfriend a user (remove both sides of friendship)
 */
export const unfriend = async (userId, friendId) => {
  if (!supabase) return null;

  // Delete both directions of the friendship
  await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

  return true;
};

/**
 * Check friendship status between two users
 * Returns: null (no friendship), 'pending', 'accepted', 'declined'
 */
export const checkFriendshipStatus = async (userId, friendId) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('friendships')
    .select('status')
    .eq('user_id', userId)
    .eq('friend_id', friendId)
    .single();

  if (error) {
    // No friendship exists
    return null;
  }

  return data.status;
};

/**
 * Get mutual friends between two users
 */
export const getMutualFriends = async (userId1, userId2) => {
  if (!supabase) return [];

  // Get user1's friends
  const { data: user1Friends, error: error1 } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', userId1)
    .eq('status', 'accepted');

  if (error1) return [];

  // Get user2's friends
  const { data: user2Friends, error: error2 } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', userId2)
    .eq('status', 'accepted');

  if (error2) return [];

  // Find intersection
  const user1FriendIds = new Set(user1Friends.map(f => f.friend_id));
  const mutualFriendIds = user2Friends
    .filter(f => user1FriendIds.has(f.friend_id))
    .map(f => f.friend_id);

  if (mutualFriendIds.length === 0) return [];

  // Get user details for mutual friends
  const { data: mutualFriends, error: error3 } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_emoji, avatar_url')
    .in('id', mutualFriendIds);

  if (error3) return [];

  return mutualFriends;
};
