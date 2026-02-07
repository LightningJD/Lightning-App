import { supabase } from '../supabase';
import type { User, NearbyUser } from '../../types';

// ============================================
// USER OPERATIONS
// ============================================

interface ClerkUser {
  id: string;
  username?: string;
  emailAddresses: Array<{ emailAddress: string }>;
  fullName?: string;
  firstName?: string;
  primaryEmailAddress?: { emailAddress: string };
  publicMetadata?: {
    customAvatar?: string;
    bio?: string;
  };
}

interface ProfileUpdateData {
  displayName?: string;
  username?: string;
  bio?: string;
  location?: string;
  avatar?: string;
  avatarUrl?: string | null;
  profileCompleted?: boolean;
  search_radius?: number;
}

/**
 * Create or update user in Supabase when they sign up with Clerk
 */
export const syncUserToSupabase = async (clerkUser: ClerkUser): Promise<User | null> => {
  if (!supabase) {
    console.error('❌ Supabase client is not initialized');
    return null;
  }

  console.log('🔄 Syncing user to Supabase:', clerkUser.id);

  // Check if user already exists to avoid overwriting profile fields like display_name
  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', clerkUser.id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = No rows
    console.error('❌ Error checking existing Supabase user:', JSON.stringify(fetchError, null, 2));
    return null;
  }

  const now = new Date().toISOString();

  if (existing) {
    console.log('✅ Found existing user:', existing.id);
    // Only set fields that are missing; do NOT override display_name or other user-edited fields
    const updates: any = { updated_at: now };
    if (!existing.username && (clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress)) {
      updates.username = clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0];
    }
    if (!existing.email && clerkUser.primaryEmailAddress?.emailAddress) {
      updates.email = clerkUser.primaryEmailAddress.emailAddress;
    }
    if (!existing.avatar_emoji && (clerkUser.publicMetadata?.customAvatar || clerkUser.firstName)) {
      updates.avatar_emoji = clerkUser.publicMetadata?.customAvatar || clerkUser.firstName?.charAt(0)?.toUpperCase() || '👤';
    }
    if (!existing.bio) {
      updates.bio = clerkUser.publicMetadata?.bio || 'Welcome to Lightning! Share your testimony to inspire others.';
    }

    if (Object.keys(updates).length > 1) {
      console.log('📝 Updating existing user with missing fields...');
      const { data: updated, error } = await supabase
        .from('users')
        // @ts-ignore dynamic updates
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) {
        console.error('❌ Error updating existing Supabase user:', error);
        return existing as unknown as User; // Return existing to avoid breaking UI
      }
      return updated as unknown as User;
    }

    return existing as unknown as User;
  }

  console.log('🆕 User not found, creating new record...');

  // Create new record for first-time users
  const newUser: any = {
    clerk_user_id: clerkUser.id,
    username: clerkUser.username || `${clerkUser.emailAddresses[0]?.emailAddress.split('@')[0]}_${clerkUser.id.slice(-4)}`,
    display_name: clerkUser.fullName || clerkUser.firstName || 'User',
    email: clerkUser.primaryEmailAddress?.emailAddress,
    avatar_emoji: clerkUser.publicMetadata?.customAvatar || clerkUser.firstName?.charAt(0)?.toUpperCase() || '👤',
    bio: clerkUser.publicMetadata?.bio || 'Welcome to Lightning! Share your testimony to inspire others.',
    updated_at: now
  };

  const { data: created, error: createError } = await supabase
    .from('users')
    .insert(newUser)
    .select()
    .single();

  if (createError) {
    console.error('❌ Error creating Supabase user:', createError);
    return null;
  }

  console.log('✅ Successfully created new user:', created.id);
  return created as unknown as User;
};

/**
 * Get user profile by Clerk ID
 */
export const getUserByClerkId = async (clerkUserId: string): Promise<User | null> => {
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

  return data as unknown as User;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, profileData: ProfileUpdateData): Promise<User | null> => {
  if (!supabase) return null;

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  // Only add fields that are provided
  if (profileData.displayName !== undefined) updates.display_name = profileData.displayName;
  if (profileData.username !== undefined) updates.username = profileData.username;
  if (profileData.bio !== undefined) updates.bio = profileData.bio;
  if (profileData.location !== undefined) updates.location_city = profileData.location;
  if (profileData.avatar !== undefined) updates.avatar_emoji = profileData.avatar;
  if (profileData.avatarUrl !== undefined) updates.avatar_url = profileData.avatarUrl;
  if (profileData.profileCompleted !== undefined) updates.profile_completed = profileData.profileCompleted;
  if (profileData.search_radius !== undefined) updates.search_radius = profileData.search_radius;

  const { data, error } = await supabase
    .from('users')
    // @ts-ignore - Supabase generated types don't allow dynamic updates
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    return null;
  }

  return data as unknown as User;
};

/**
 * Update user location
 */
export const updateUserLocation = async (userId: string, latitude: number, longitude: number): Promise<User | null> => {
  if (!supabase) return null;

  const updateData: any = {
    location_lat: latitude,
    location_lng: longitude,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('users')
    // @ts-ignore - Supabase generated types don't allow dynamic updates
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating location:', error);
    return null;
  }

  return data as unknown as User;
};

/**
 * Find nearby users within radius
 * Now respects privacy settings (is_private, notify_nearby)
 */
export const findNearbyUsers = async (
  latitude: number,
  longitude: number,
  radiusMiles: number = 25,
  currentUserId: string | null = null
): Promise<NearbyUser[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .rpc('find_nearby_users', {
      user_lat: latitude,
      user_lng: longitude,
      radius_miles: radiusMiles,
      current_user_id: currentUserId
    } as any);

  if (error) {
    console.error('Error finding nearby users:', error);
    return [];
  }

  return (data || []) as unknown as NearbyUser[];
};

/**
 * Update user online status
 */
export const updateOnlineStatus = async (userId: string, isOnline: boolean): Promise<any> => {
  if (!supabase) return null;

  const updateData: any = {
    is_online: isOnline,
    last_seen: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('users')
    // @ts-ignore - Supabase generated types don't allow dynamic updates
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('Error updating online status:', error);
    return null;
  }

  return data;
};

/**
 * Search users by display name or username
 */
export const searchUsers = async (
  searchQuery: string,
  currentUserId: string | null = null
): Promise<User[]> => {
  if (!supabase || !searchQuery.trim()) return [];

  const query = searchQuery.trim().toLowerCase();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
    .neq('id', currentUserId || '')
    .limit(20);

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return (data || []) as unknown as User[];
};

/**
 * Get all users (fallback when location is not available)
 * Respects privacy settings
 */
export const getAllUsers = async (
  currentUserId: string | null = null,
  limit: number = 50
): Promise<User[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .neq('id', currentUserId || '')
    .eq('is_private', false) // Only show users who are not private
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching all users:', error);
    return [];
  }

  return (data || []) as unknown as User[];
};

/**
 * Check if a user has admin role
 * Queries the 'role' column in users table (defaults to 'user')
 */
export const isAdmin = async (userId: string): Promise<boolean> => {
  if (!supabase || !userId) return false;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('role' as any)
      .eq('id', userId)
      .single();

    if (error) {
      // If role column doesn't exist yet, fail gracefully
      console.error('Error checking admin status:', error);
      return false;
    }

    return (data as any)?.role === 'admin';
  } catch {
    return false;
  }
};
