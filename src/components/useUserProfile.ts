import { useEffect, useState } from 'react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { getTestimonyByUserId, getChurchById } from '../lib/database';
import { supabase } from '../lib/supabase';


/**
 * Custom hook to sync Supabase Auth user data with Lightning app profile.
 *
 * After Supabase Auth sign-up, the user has a UUID in auth.users.
 * We look up (or create) a row in public.users by matching email,
 * then build the same profile object the rest of the app expects.
 */
export interface UseUserProfileReturn {
  isLoading: boolean;
  isAuthenticated: boolean;
  isSyncing: boolean;
  profile: any | null;
  user?: any;
}

export const useUserProfile = (): UseUserProfileReturn => {
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useSupabaseAuth();
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [testimony, setTestimony] = useState<any>(null);
  const [church, setChurch] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(true);

  // Sync user to public.users when they sign in or when refresh is triggered
  useEffect(() => {
    const syncUser = async () => {
      if (authLoading) return;

      if (isAuthenticated && authUser && supabase) {
        try {
          const email = authUser.email;
          const metadata = authUser.user_metadata || {};

          // Try to find existing user by email first (links Clerk-era accounts)
          let dbUser: any = null;

          if (email) {
            const { data: existingByEmail } = await supabase
              .from('users')
              .select('*')
              .eq('email', email)
              .single();

            if (existingByEmail) {
              dbUser = existingByEmail;
              console.log('✅ Found existing user by email:', dbUser.id);
            }
          }

          // If not found by email, try by auth user id stored in clerk_user_id column
          // (future-proofing: after migration we could store Supabase auth UUID there)
          if (!dbUser) {
            const { data: existingById } = await supabase
              .from('users')
              .select('*')
              .eq('clerk_user_id', authUser.id)
              .single();

            if (existingById) {
              dbUser = existingById;
              console.log('✅ Found existing user by auth ID:', dbUser.id);
            }
          }

          // Create new user if not found
          if (!dbUser) {
            console.log('🆕 Creating new user record for:', email);
            const username = metadata.username || email?.split('@')[0] || 'user';
            const displayName = metadata.display_name || username;

            const { data: created, error: createError } = await supabase
              .from('users')
              .insert({
                clerk_user_id: authUser.id, // Store Supabase auth UUID in this column
                username,
                display_name: displayName,
                email,
                avatar_emoji: displayName.charAt(0)?.toUpperCase() || '👤',
                bio: 'Welcome to Lightning! Share your testimony to inspire others.',
                updated_at: new Date().toISOString()
              } as any)
              .select()
              .single();

            if (createError) {
              console.error('❌ Error creating user:', createError);
            } else {
              dbUser = created;
              console.log('✅ Created new user:', dbUser.id);
            }
          }

          setSupabaseUser(dbUser);

          // Load testimony
          if (dbUser?.id) {
            const userTestimony = await getTestimonyByUserId(dbUser.id);
            if (userTestimony) {
              console.log('✅ Testimony loaded:', userTestimony.id);
              setTestimony(userTestimony);
            } else {
              setTestimony(null);
            }

            // Load church data
            if (dbUser.church_id) {
              const churchData = await getChurchById(dbUser.church_id);
              if (churchData) {
                console.log('✅ Church loaded:', churchData.name);
                setChurch(churchData);
              }
            } else {
              setChurch(null);
            }
          }
        } catch (error: any) {
          console.error('❌ Error syncing user profile:', error);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setIsSyncing(false);
      }
    };

    syncUser();
  }, [authLoading, isAuthenticated, authUser?.id, refreshTrigger]);

  // Listen for profile updates via custom event
  useEffect(() => {
    const handleProfileUpdate = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  if (authLoading || (isAuthenticated && isSyncing)) {
    return {
      isLoading: true,
      isAuthenticated: false,
      isSyncing: true,
      profile: null,
      user: undefined
    };
  }

  if (!isAuthenticated || !authUser) {
    return {
      isLoading: false,
      isAuthenticated: false,
      isSyncing: false,
      profile: null,
      user: undefined
    };
  }

  // Get first name initial for avatar
  const getDefaultAvatar = () => {
    const metadata = authUser.user_metadata || {};
    const name = metadata.display_name || metadata.username || authUser.email;
    if (name) return name.charAt(0).toUpperCase();
    return '👤';
  };

  // Transform user data into Lightning profile format
  const profile = {
    supabaseId: supabaseUser?.id,
    clerkUserId: authUser.id, // Now actually the Supabase Auth UUID
    username: supabaseUser?.username || authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
    displayName: supabaseUser?.display_name || authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'User',
    avatar: supabaseUser?.avatar_emoji || getDefaultAvatar(),
    avatarImage: supabaseUser?.avatar_url || null,
    email: authUser.email,
    bio: supabaseUser?.bio || 'Welcome to Lightning! Share your testimony to inspire others.',
    hasTestimony: testimony ? true : (supabaseUser?.has_testimony || false),
    testimony: testimony?.content || null,
    testimonyLesson: testimony?.lesson || null,
    location: supabaseUser?.location_city || null,
    locationLat: supabaseUser?.location_lat || null,
    locationLng: supabaseUser?.location_lng || null,
    profileCompleted: supabaseUser?.profile_completed || false,
    // Privacy settings
    isPrivate: supabaseUser?.is_private || false,
    testimonyVisibility: supabaseUser?.testimony_visibility || 'everyone',
    messagePrivacy: supabaseUser?.message_privacy || 'everyone',
    profileVisibility: (supabaseUser as any)?.profile_visibility || 'public',
    // Church
    churchId: (supabaseUser as any)?.church_id || null,
    church: church ? {
      id: church.id,
      name: church.name,
      location: church.location,
      denomination: church.denomination,
      inviteCode: church.invite_code,
      memberCount: church.member_count,
      createdBy: church.created_by,
    } : null,
    // Notification settings
    notifyMessages: supabaseUser?.notify_messages !== false,
    notifyFriendRequests: supabaseUser?.notify_friend_requests !== false,
    notifyNearby: supabaseUser?.notify_nearby !== false,
    // Search settings
    searchRadius: supabaseUser?.search_radius || 25,
    spotifyUrl: supabaseUser?.spotify_url || null,
    songName: (supabaseUser as any)?.song_name || null,
    songArtist: (supabaseUser as any)?.song_artist || null,
    // Profile card fields
    churchName: supabaseUser?.church_name || null,
    churchLocation: supabaseUser?.church_location || null,
    denomination: supabaseUser?.denomination || null,
    yearSaved: supabaseUser?.year_saved || null,
    isBaptized: supabaseUser?.is_baptized || false,
    yearBaptized: supabaseUser?.year_baptized || null,
    favoriteVerse: supabaseUser?.favorite_verse || null,
    favoriteVerseRef: supabaseUser?.favorite_verse_ref || null,
    faithInterests: supabaseUser?.faith_interests || [],
    entryNumber: supabaseUser?.entry_number || null,
    // Referral & Points
    referralCode: (supabaseUser as any)?.referral_code || null,
    blessingPoints: (supabaseUser as any)?.blessing_points || 0,
    overallPoints: (supabaseUser as any)?.overall_points || 0,
    ambassadorTermsAccepted: !!(supabaseUser as any)?.ambassador_terms_accepted_at,
    isFlagged: (supabaseUser as any)?.is_flagged || false,
    music: (() => {
      const songUrl = supabaseUser?.spotify_url;
      if (!songUrl) return null;

      return {
        platform: 'youtube' as const,
        trackName: (supabaseUser as any)?.song_name || 'My Song',
        artist: (supabaseUser as any)?.song_artist || '',
        spotifyUrl: songUrl,
      };
    })(),
    story: testimony ? {
      id: testimony.id,
      title: testimony.title || "My Testimony",
      content: testimony.content,
      lesson: testimony.lesson,
      viewCount: testimony.view_count || 0,
      likeCount: testimony.like_count || 0
    } : {
      id: null,
      title: "My Testimony",
      content: null,
      lesson: null,
      viewCount: 0,
      likeCount: 0
    }
  };

  return {
    isLoading: false,
    isAuthenticated: true,
    isSyncing: false,
    profile,
    user: authUser
  };
};
