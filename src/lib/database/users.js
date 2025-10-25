import { supabase } from '../supabase';

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
