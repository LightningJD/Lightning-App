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
