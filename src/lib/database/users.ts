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
}

/**
 * Create or update user in Supabase when they sign up with Clerk
 */
export const syncUserToSupabase = async (clerkUser: ClerkUser): Promise<User | null> => {
  if (!supabase) return null;

  const userData: any = {
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

  return data as unknown as User;
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
  if (profileData.displayName) updates.display_name = profileData.displayName;
  if (profileData.username) updates.username = profileData.username;
  if (profileData.bio) updates.bio = profileData.bio;
  if (profileData.location) updates.location_city = profileData.location;
  if (profileData.avatar) updates.avatar_emoji = profileData.avatar;
  if (profileData.avatarUrl !== undefined) updates.avatar_url = profileData.avatarUrl;
  if (profileData.profileCompleted !== undefined) updates.profile_completed = profileData.profileCompleted;

  const { data, error} = await supabase
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
