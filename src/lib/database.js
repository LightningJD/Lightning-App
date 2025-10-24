import { supabase } from './supabase';

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Create or update user in Supabase when they sign up with Clerk
 */
export const syncUserToSupabase = async (clerkUser) => {
  if (!supabase) return null;

  const userData = {
    clerk_user_id: clerkUser.id,
    username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0],
    display_name: clerkUser.fullName || clerkUser.firstName || 'User',
    email: clerkUser.primaryEmailAddress?.emailAddress,
    avatar_emoji: clerkUser.publicMetadata?.customAvatar || clerkUser.firstName?.charAt(0)?.toUpperCase() || '👤',
    bio: clerkUser.publicMetadata?.bio || 'Welcome to Lightning! Share your testimony to inspire others.',
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('users')
    .upsert(userData, { onConflict: 'clerk_user_id' })
    .select()
    .single();

  if (error) {
    console.error('Error syncing user to Supabase:', error);
    return null;
  }

  return data;
};

/**
 * Get user profile by Clerk ID
 */
export const getUserByClerkId = async (clerkUserId) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, profileData) => {
  if (!supabase) return null;

  const updates = {
    updated_at: new Date().toISOString()
  };

  // Only add fields that are provided
  if (profileData.displayName) updates.display_name = profileData.displayName;
  if (profileData.username) updates.username = profileData.username;
  if (profileData.bio) updates.bio = profileData.bio;
  if (profileData.location) updates.location_city = profileData.location;
  if (profileData.avatar) updates.avatar_emoji = profileData.avatar;
  if (profileData.avatarUrl !== undefined) updates.avatar_url = profileData.avatarUrl;
  if (profileData.profileCompleted !== undefined) updates.profile_completed = profileData.profileCompleted;

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    return null;
  }

  return data;
};

/**
 * Update user location
 */
export const updateUserLocation = async (userId, latitude, longitude) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('users')
    .update({
      location_lat: latitude,
      location_lng: longitude,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating location:', error);
    return null;
  }

  return data;
};

/**
 * Find nearby users within radius
 */
export const findNearbyUsers = async (latitude, longitude, radiusMiles = 25) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .rpc('find_nearby_users', {
      user_lat: latitude,
      user_lng: longitude,
      radius_miles: radiusMiles
    });

  if (error) {
    console.error('Error finding nearby users:', error);
    return [];
  }

  return data;
};

/**
 * Update user online status
 */
export const updateOnlineStatus = async (userId, isOnline) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('users')
    .update({
      is_online: isOnline,
      last_seen: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating online status:', error);
    return null;
  }

  return data;
};

// ============================================
// TESTIMONY OPERATIONS
// ============================================

/**
 * Create a new testimony
 */
export const createTestimony = async (userId, testimonyData) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('testimonies')
    .insert({
      user_id: userId,
      title: testimonyData.title || 'My Testimony',
      content: testimonyData.content,
      lesson: testimonyData.lesson,
      question1_answer: testimonyData.question1,
      question2_answer: testimonyData.question2,
      question3_answer: testimonyData.question3,
      question4_answer: testimonyData.question4,
      word_count: testimonyData.content.split(' ').length,
      is_public: testimonyData.isPublic ?? true,
      music_spotify_url: testimonyData.musicSpotifyUrl,
      music_track_name: testimonyData.musicTrackName,
      music_artist: testimonyData.musicArtist,
      music_audio_url: testimonyData.musicAudioUrl
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating testimony:', error);
    return null;
  }

  // Update user's has_testimony flag
  await supabase
    .from('users')
    .update({ has_testimony: true })
    .eq('id', userId);

  return data;
};

/**
 * Get testimony by user ID
 */
export const getTestimonyByUserId = async (userId) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('testimonies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching testimony:', error);
    return null;
  }

  return data;
};

/**
 * Update testimony
 */
export const updateTestimony = async (testimonyId, updates) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('testimonies')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', testimonyId)
    .select()
    .single();

  if (error) {
    console.error('Error updating testimony:', error);
    return null;
  }

  return data;
};

// ============================================
// MESSAGE OPERATIONS
// ============================================

/**
 * Send a direct message
 */
export const sendMessage = async (senderId, recipientId, content) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('messages')
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
export const getConversation = async (userId1, userId2, limit = 50) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('messages')
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
export const getUserConversations = async (userId) => {
  if (!supabase) return [];

  // Get all messages where user is either sender or recipient
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:users!sender_id(id, username, display_name, avatar_emoji, avatar_url, is_online), recipient:users!recipient_id(id, username, display_name, avatar_emoji, avatar_url, is_online)')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }

  // Group messages by conversation partner
  const conversationsMap = new Map();

  data.forEach(msg => {
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

  return Array.from(conversationsMap.values()).sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (messageId) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('messages')
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
// GROUP OPERATIONS
// ============================================

/**
 * Create a new group
 */
export const createGroup = async (creatorId, groupData) => {
  if (!supabase) return null;

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: groupData.name,
      description: groupData.description,
      avatar_emoji: groupData.avatarEmoji || '✝️',
      creator_id: creatorId,
      is_private: groupData.isPrivate ?? false
    })
    .select()
    .single();

  if (groupError) {
    console.error('Error creating group:', groupError);
    return null;
  }

  // Add creator as leader
  await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: creatorId,
      role: 'leader'
    });

  return group;
};

/**
 * Get user's groups
 */
export const getUserGroups = async (userId) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('group_members')
    .select('*, group:groups(*)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user groups:', error);
    return [];
  }

  return data.map(membership => ({
    ...membership.group,
    userRole: membership.role
  }));
};

/**
 * Send group message
 */
export const sendGroupMessage = async (groupId, senderId, content) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('group_messages')
    .insert({
      group_id: groupId,
      sender_id: senderId,
      content
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending group message:', error);
    return null;
  }

  return data;
};

/**
 * Get group messages
 */
export const getGroupMessages = async (groupId, limit = 100) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('group_messages')
    .select('*, sender:users!sender_id(username, display_name, avatar_emoji)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching group messages:', error);
    return [];
  }

  return data;
};

/**
 * Update group details
 */
export const updateGroup = async (groupId, updates) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('groups')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', groupId)
    .select()
    .single();

  if (error) {
    console.error('Error updating group:', error);
    return null;
  }

  return data;
};

/**
 * Delete group (leaders only)
 */
export const deleteGroup = async (groupId) => {
  if (!supabase) return null;

  // Delete group members first (cascade should handle this, but being explicit)
  await supabase.from('group_members').delete().eq('group_id', groupId);

  // Delete group messages
  await supabase.from('group_messages').delete().eq('group_id', groupId);

  // Delete the group
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error('Error deleting group:', error);
    return null;
  }

  return true;
};

/**
 * Leave group (remove self from members)
 */
export const leaveGroup = async (groupId, userId) => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error leaving group:', error);
    return null;
  }

  return true;
};

/**
 * Get group members
 */
export const getGroupMembers = async (groupId) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('group_members')
    .select('*, user:users!user_id(id, username, display_name, avatar_emoji, is_online)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching group members:', error);
    return [];
  }

  return data;
};

/**
 * Invite user to group
 */
export const inviteToGroup = async (groupId, userId) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: userId,
      role: 'member'
    })
    .select()
    .single();

  if (error) {
    console.error('Error inviting to group:', error);
    return null;
  }

  return data;
};

/**
 * Remove member from group
 */
export const removeMemberFromGroup = async (groupId, userId) => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing member:', error);
    return null;
  }

  return true;
};

/**
 * Promote member to leader
 */
export const promoteMemberToLeader = async (groupId, userId) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('group_members')
    .update({ role: 'leader' })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error promoting member:', error);
    return null;
  }

  return data;
};

/**
 * Search public groups
 */
export const searchPublicGroups = async (searchQuery = '') => {
  if (!supabase) return [];

  let query = supabase
    .from('groups')
    .select('*, member_count:group_members(count)')
    .eq('is_private', false);

  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error searching groups:', error);
    return [];
  }

  return data;
};

/**
 * Request to join a group
 */
export const requestToJoinGroup = async (groupId, userId, message = '') => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('join_requests')
    .insert({
      group_id: groupId,
      user_id: userId,
      message,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Error requesting to join group:', error);
    return null;
  }

  return data;
};

/**
 * Get pending join requests for a group (leaders only)
 */
export const getGroupJoinRequests = async (groupId) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('join_requests')
    .select('*, user:users!user_id(id, username, display_name, avatar_emoji)')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching join requests:', error);
    return [];
  }

  return data;
};

/**
 * Approve join request
 */
export const approveJoinRequest = async (requestId, groupId, userId) => {
  if (!supabase) return null;

  // Update request status
  await supabase
    .from('join_requests')
    .update({ status: 'approved' })
    .eq('id', requestId);

  // Add user to group
  const { data, error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: userId,
      role: 'member'
    })
    .select()
    .single();

  if (error) {
    console.error('Error approving join request:', error);
    return null;
  }

  return data;
};

/**
 * Deny join request
 */
export const denyJoinRequest = async (requestId) => {
  if (!supabase) return null;

  const { error } = await supabase
    .from('join_requests')
    .update({ status: 'denied' })
    .eq('id', requestId);

  if (error) {
    console.error('Error denying join request:', error);
    return null;
  }

  return true;
};

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

// ============================================
// MESSAGE REACTIONS
// ============================================

/**
 * Add reaction to message
 */
export const addReaction = async (messageId, userId, emoji) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('message_reactions')
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
export const removeReaction = async (messageId, userId, emoji) => {
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
export const getMessageReactions = async (messageId) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('message_reactions')
    .select('*, user:users!user_id(id, display_name, avatar_emoji)')
    .eq('message_id', messageId);

  if (error) {
    console.error('Error fetching reactions:', error);
    return [];
  }

  return data;
};

// ============================================
// PINNED MESSAGES
// ============================================

/**
 * Pin a group message (leaders only)
 */
export const pinMessage = async (messageId, userId) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('group_messages')
    .update({
      is_pinned: true,
      pinned_by: userId,
      pinned_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    console.error('Error pinning message:', error);
    return null;
  }

  return data;
};

/**
 * Unpin a group message
 */
export const unpinMessage = async (messageId) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('group_messages')
    .update({
      is_pinned: false,
      pinned_by: null,
      pinned_at: null
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    console.error('Error unpinning message:', error);
    return null;
  }

  return data;
};

/**
 * Get pinned messages for a group
 */
export const getPinnedMessages = async (groupId) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('group_messages')
    .select('*, sender:users!sender_id(username, display_name, avatar_emoji)')
    .eq('group_id', groupId)
    .eq('is_pinned', true)
    .order('pinned_at', { ascending: false });

  if (error) {
    console.error('Error fetching pinned messages:', error);
    return [];
  }

  return data;
};

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to new messages for a user
 */
export const subscribeToMessages = (userId, callback) => {
  if (!supabase) return null;

  const subscription = supabase
    .channel('messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`
      },
      callback
    )
    .subscribe();

  return subscription;
};

/**
 * Subscribe to group messages
 */
export const subscribeToGroupMessages = (groupId, callback) => {
  if (!supabase) return null;

  const subscription = supabase
    .channel(`group_messages:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`
      },
      callback
    )
    .subscribe();

  return subscription;
};

/**
 * Unsubscribe from a channel
 */
export const unsubscribe = async (subscription) => {
  if (!supabase || !subscription) return;
  await supabase.removeChannel(subscription);
};

// ============================================
// TESTIMONY ANALYTICS FUNCTIONS
// ============================================

/**
 * Track testimony view (one per user per testimony)
 */
export const trackTestimonyView = async (testimonyId, viewerId) => {
  if (!supabase) return { success: false, error: 'Database not initialized' };

  try {
    const { error } = await supabase
      .from('testimony_views')
      .insert({
        testimony_id: testimonyId,
        viewer_id: viewerId
      });

    if (error) {
      // Ignore duplicate view errors (already viewed)
      if (error.code === '23505') {
        return { success: true, alreadyViewed: true };
      }
      throw error;
    }

    return { success: true, alreadyViewed: false };
  } catch (error) {
    console.error('Error tracking testimony view:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get testimony view count
 */
export const getTestimonyViewCount = async (testimonyId) => {
  if (!supabase) return { count: 0 };

  try {
    const { data, error } = await supabase
      .from('testimony_views')
      .select('id', { count: 'exact' })
      .eq('testimony_id', testimonyId);

    if (error) throw error;

    return { count: data?.length || 0 };
  } catch (error) {
    console.error('Error getting view count:', error);
    return { count: 0 };
  }
};

/**
 * Toggle testimony like/heart
 */
export const toggleTestimonyLike = async (testimonyId, userId) => {
  if (!supabase) return { success: false, error: 'Database not initialized' };

  try {
    // Check if already liked
    const { data: existing } = await supabase
      .from('testimony_likes')
      .select('id')
      .eq('testimony_id', testimonyId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Unlike - remove the like
      const { error } = await supabase
        .from('testimony_likes')
        .delete()
        .eq('id', existing.id);

      if (error) throw error;
      return { success: true, liked: false };
    } else {
      // Like - add new like
      const { error } = await supabase
        .from('testimony_likes')
        .insert({
          testimony_id: testimonyId,
          user_id: userId
        });

      if (error) throw error;
      return { success: true, liked: true };
    }
  } catch (error) {
    console.error('Error toggling testimony like:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if user liked a testimony
 */
export const hasUserLikedTestimony = async (testimonyId, userId) => {
  if (!supabase) return { liked: false };

  try {
    const { data, error } = await supabase
      .from('testimony_likes')
      .select('id')
      .eq('testimony_id', testimonyId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return { liked: !!data };
  } catch (error) {
    console.error('Error checking testimony like:', error);
    return { liked: false };
  }
};

/**
 * Get testimony like count
 */
export const getTestimonyLikeCount = async (testimonyId) => {
  if (!supabase) return { count: 0 };

  try {
    const { data, error } = await supabase
      .from('testimony_likes')
      .select('id', { count: 'exact' })
      .eq('testimony_id', testimonyId);

    if (error) throw error;

    return { count: data?.length || 0 };
  } catch (error) {
    console.error('Error getting like count:', error);
    return { count: 0 };
  }
};

/**
 * Add comment to testimony
 */
export const addTestimonyComment = async (testimonyId, userId, content) => {
  if (!supabase) return { success: false, error: 'Database not initialized' };

  try {
    const { data, error } = await supabase
      .from('testimony_comments')
      .insert({
        testimony_id: testimonyId,
        user_id: userId,
        content: content.trim()
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, comment: data };
  } catch (error) {
    console.error('Error adding testimony comment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get testimony comments
 */
export const getTestimonyComments = async (testimonyId) => {
  if (!supabase) return { comments: [] };

  try {
    const { data, error } = await supabase
      .from('testimony_comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        users:user_id (
          username,
          display_name,
          avatar_emoji,
          avatar_url
        )
      `)
      .eq('testimony_id', testimonyId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { comments: data || [] };
  } catch (error) {
    console.error('Error getting testimony comments:', error);
    return { comments: [] };
  }
};

/**
 * Delete testimony comment
 */
export const deleteTestimonyComment = async (commentId, userId) => {
  if (!supabase) return { success: false, error: 'Database not initialized' };

  try {
    const { error } = await supabase
      .from('testimony_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting testimony comment:', error);
    return { success: false, error: error.message };
  }
};
