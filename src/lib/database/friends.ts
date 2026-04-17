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
 * Send a friend request.
 *
 * Inserts a pending friendship row, then — mirroring the pattern in
 * acceptFriendRequest — creates a `friend_request` notification for the
 * recipient so they actually see something in the notifications panel.
 *
 * The notification insert is non-fatal: if it fails the friendship is still
 * returned, since the recipient can still discover the request via the
 * pending-requests query in NotificationsPanel.
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

  // Notify the recipient (toUserId) that they have a new friend request.
  // Parallel fetch of sender name + recipient's notify preference to keep
  // this off the critical path.
  const [senderRes, recipientPrefRes] = await Promise.all([
    supabase
      .from('users')
      .select('display_name, username')
      .eq('id', fromUserId)
      .single(),
    supabase
      .from('users')
      .select('notify_friend_requests')
      .eq('id', toUserId)
      .single(),
  ]);

  const senderName =
    (senderRes.data as any)?.display_name ||
    (senderRes.data as any)?.username ||
    'Someone';
  const shouldNotifyRecipient =
    (recipientPrefRes.data as any)?.notify_friend_requests !== false;

  if (shouldNotifyRecipient) {
    const { error: notificationError } = await supabase
      .from('notifications')
      // @ts-ignore - Supabase generated types are incomplete
      .insert({
        user_id: toUserId,
        type: 'friend_request',
        title: 'New Friend Request',
        content: `${senderName} sent you a friend request`,
        link: `/profile/${fromUserId}`,
        is_read: false,
      });

    if (notificationError) {
      // Non-fatal: recipient can still see the pending request via the
      // friend_requests section of NotificationsPanel.
      console.error('Error creating friend_request notification:', notificationError);
    }
  }

  return data as Friend;
};

/**
 * Accept a friend request.
 *
 * Delegates the UPDATE (pending → accepted) and the reverse-row INSERT to the
 * `accept_friend_request` Postgres RPC so both statements commit atomically.
 * Before this RPC was introduced we ran two separate round-trips with a
 * compensating UPDATE on insert failure, which could still leave a
 * half-committed state if the compensation itself failed (connectivity blip,
 * RLS drift, etc.). See migration 20260417100000_create_accept_friend_request_rpc.sql.
 *
 * Notifications stay outside the transaction as a best-effort side-effect:
 * the accepted friendship is the source of truth and we don't want a flaky
 * notifications insert to roll the friendship back.
 */
export const acceptFriendRequest = async (requestId: string): Promise<Friend | null> => {
  if (!supabase) return null;

  const { data: rpcData, error: rpcError } = await supabase
    // @ts-ignore - RPC not yet in generated Supabase types (migration 20260417100000)
    .rpc('accept_friend_request', { _request_id: requestId });

  if (rpcError) {
    console.error('Error accepting friend request:', rpcError);
    return null;
  }

  // RPC returns the accepted friendship row as JSONB.
  const data = rpcData as Friend | null;
  if (!data) {
    console.error('accept_friend_request RPC returned no row');
    return null;
  }

  // Notify the original requester (user_id_1) that their request was accepted.
  // Best-effort: failures here must not affect the accepted friendship state.
  const { user_id_1, user_id_2 } = data as any;

  const { data: accepterData } = await supabase
    .from('users')
    .select('display_name, username')
    .eq('id', user_id_2)
    .single();

  const accepterName = accepterData?.display_name || accepterData?.username || 'Someone';

  const { data: requesterPrefData } = await supabase
    .from('users')
    .select('notify_friend_requests')
    .eq('id', user_id_1)
    .single();

  const shouldNotifyRequester = requesterPrefData?.notify_friend_requests !== false;

  if (shouldNotifyRequester) {
    const { error: notificationError } = await supabase
      .from('notifications')
      // @ts-ignore - Supabase generated types are incomplete
      .insert({
        user_id: user_id_1,
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        content: `${accepterName} accepted your friend request`,
        link: `/profile/${user_id_2}`,
        is_read: false
      });

    if (notificationError) {
      console.error('Error creating friend_accepted notification:', notificationError);
    }
  }

  return data;
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
 * Get user's friends (accepted friendships) - bidirectional
 */
export const getFriends = async (userId: string): Promise<FriendWithUser[]> => {
  if (!supabase) return [];

  // Get friends where user is user_id_1 (user initiated)
  const { data: friends1, error: error1 } = await supabase
    .from('friendships')
    .select('*, friend:users!user_id_2(id, username, display_name, avatar_emoji, avatar_url, is_online, bio, location_city)')
    .eq('user_id_1', userId)
    .eq('status', 'accepted');

  if (error1) {
    console.error('Error fetching friends (user_id_1):', error1);
  }

  // Get friends where user is user_id_2 (friend initiated)
  const { data: friends2, error: error2 } = await supabase
    .from('friendships')
    .select('*, friend:users!user_id_1(id, username, display_name, avatar_emoji, avatar_url, is_online, bio, location_city)')
    .eq('user_id_2', userId)
    .eq('status', 'accepted');

  if (error2) {
    console.error('Error fetching friends (user_id_2):', error2);
  }

  // Combine both lists and remove duplicates
  const allFriends = [
    ...((friends1 as any[]) || []).map((friendship: any) => friendship.friend),
    ...((friends2 as any[]) || []).map((friendship: any) => friendship.friend)
  ].filter(Boolean);

  // Remove duplicates by id
  const uniqueFriends = Array.from(
    new Map(allFriends.map((friend: any) => [friend.id, friend])).values()
  );

  return uniqueFriends as FriendWithUser[];
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
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id_1.eq.${userId},user_id_2.eq.${friendId}),and(user_id_1.eq.${friendId},user_id_2.eq.${userId})`);

  if (error) {
    console.error('Error unfriending user:', error);
    return null;
  }

  return true;
};

/**
 * Check friendship status between two users.
 *
 * Returns the strongest status among any rows linking the two users.
 *
 * NOTE: `friendships` can hold MULTIPLE rows for the same pair. The
 * `accept_friend_request` RPC (shipped in #68 / P1-1) writes an additional
 * caller→target 'accepted' row on top of the original target→caller row,
 * so an accepted friendship is typically stored as 2 rows. We therefore
 * cannot use `.single()` here — it throws "multiple rows" and the client
 * would incorrectly render "Add Friend" on a friend's profile (BUG-G).
 *
 * Status precedence used when multiple rows exist:
 *   accepted > pending > rejected
 *
 * Returns: null (no friendship), 'pending', 'accepted', 'rejected'.
 */
export const checkFriendshipStatus = async (userId: string, friendId: string): Promise<'pending' | 'accepted' | 'rejected' | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('friendships')
    .select('status')
    .or(`and(user_id_1.eq.${userId},user_id_2.eq.${friendId}),and(user_id_1.eq.${friendId},user_id_2.eq.${userId})`);

  if (error) {
    console.error('Error checking friendship status:', error);
    return null;
  }

  const rows = (data as any[]) || [];
  if (rows.length === 0) return null;

  const statuses = new Set<string>(rows.map((r) => r.status));
  if (statuses.has('accepted')) return 'accepted';
  if (statuses.has('pending')) return 'pending';
  if (statuses.has('rejected')) return 'rejected';
  return null;
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

/**
 * Get friends-of-friends (2nd degree connections)
 * For each of the user's friends, get their friends, excluding self and existing friends.
 * Returns deduplicated list with mutual friend count.
 */
export const getFriendsOfFriends = async (
  userId: string,
  friendIds: string[]
): Promise<(FriendWithUser & { mutualFriendCount: number })[]> => {
  if (!supabase || friendIds.length === 0) return [];

  try {
    // Get all friendships where one of the user's friends is user_id_1
    const { data: fofData, error } = await supabase
      .from('friendships')
      .select('user_id_1, user_id_2')
      .in('user_id_1', friendIds)
      .eq('status', 'accepted');

    if (error || !fofData) return [];

    // Collect friend-of-friend IDs and count mutual connections
    const excludeIds = new Set([userId, ...friendIds]);
    const fofCounts = new Map<string, number>();

    for (const row of fofData as any[]) {
      const fofId = row.user_id_2;
      if (excludeIds.has(fofId)) continue;
      fofCounts.set(fofId, (fofCounts.get(fofId) || 0) + 1);
    }

    if (fofCounts.size === 0) return [];

    // Get user details for friend-of-friend IDs (limit to 20)
    const fofIds = Array.from(fofCounts.keys()).slice(0, 20);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_emoji, avatar_url, is_online, bio, location_city')
      .in('id', fofIds);

    if (usersError || !users) return [];

    // Attach mutual friend count and sort by it descending
    return (users as any[])
      .map(u => ({
        ...u,
        mutualFriendCount: fofCounts.get(u.id) || 0
      }))
      .sort((a, b) => b.mutualFriendCount - a.mutualFriendCount) as (FriendWithUser & { mutualFriendCount: number })[];
  } catch (error) {
    console.error('Error getting friends of friends:', error);
    return [];
  }
};
