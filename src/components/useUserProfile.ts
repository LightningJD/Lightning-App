import { useUser, useSession } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { syncUserToSupabase, getTestimonyByUserId } from '../lib/database';


/**
 * Custom hook to sync Clerk user data with Lightning app profile
 */
export interface UseUserProfileReturn {
  isLoading: boolean;
  isAuthenticated: boolean;
  isSyncing: boolean;
  profile: any | null;
  user?: any;
}

export const useUserProfile = (): UseUserProfileReturn => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { session } = useSession();
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [testimony, setTestimony] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(true);

  // Sync user to Supabase when they sign in or when refresh is triggered
  useEffect(() => {
    const syncUser = async () => {
      // Wait for Clerk to load
      if (!isLoaded) return;

      if (isSignedIn && user && session) {
        try {
          // Get Supabase token from Clerk
          let token = null;
          try {
            token = await session.getToken({ template: 'supabase' });
          } catch (tokenError) {
            console.warn('⚠️ Failed to retrieve Supabase token (template might be missing):', tokenError);
          }

          if (token) {
            console.log('✅ Retrieving Supabase token from Clerk success');
            // Set session on Supabase client to enable RLS
            // We use the same token for refresh_token as a workaround since Clerk handles auth
            const { error } = await import('../lib/supabase').then(m =>
              m.supabase?.auth.setSession({
                access_token: token,
                refresh_token: token
              }) || { data: { user: null, session: null }, error: null }
            );

            if (error) {
              console.error('❌ Error setting Supabase session:', error);
            } else {
              console.log('✅ Supabase session set successfully');
            }
          } else {
            console.warn('⚠️ No Supabase token available - ensuring Supabase client is ready for public/anon access');
          }

          // Sync Clerk user to Supabase
          // @ts-ignore - Clerk user type compatibility
          const dbUser = await syncUserToSupabase(user);
          setSupabaseUser(dbUser);

          // Load testimony if user has one
          if (dbUser && dbUser.id) {
            const userTestimony = await getTestimonyByUserId(dbUser.id);
            if (userTestimony) {
              console.log('✅ Testimony loaded:', userTestimony.id);
              setTestimony(userTestimony);
            } else {
              console.log('ℹ️ No testimony found for user:', dbUser.id);
              setTestimony(null);
            }
          } else {
            console.error('❌ Sync failed: No Database User returned from syncUserToSupabase');
          }
        } catch (error: any) {
          console.error('❌ Error syncing user profile:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Not signed in, so we are done "syncing"
        setIsSyncing(false);
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, user, session, refreshTrigger]);

  // Listen for profile updates via custom event
  useEffect(() => {
    const handleProfileUpdate = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  if (!isLoaded || (isSignedIn && isSyncing)) {
    return {
      isLoading: true,
      isAuthenticated: false,
      isSyncing: true,
      profile: null,
      user: undefined
    };
  }

  if (!isSignedIn || !user) {
    return {
      isLoading: false,
      isAuthenticated: false,
      isSyncing: false,
      profile: null,
      user: undefined
    };
  }

  // Get first name initial for avatar if no custom avatar set
  const getDefaultAvatar = () => {
    const firstName = user.firstName || user.fullName?.split(' ')[0] || user.username;
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    return '👤';
  };

  // Transform Clerk user data into Lightning profile format
  const profile = {
    supabaseId: supabaseUser?.id, // Supabase UUID for database operations
    clerkUserId: user.id,
    username: supabaseUser?.username || user.username || user.emailAddresses[0]?.emailAddress.split('@')[0] || 'user',
    displayName: supabaseUser?.display_name || user.fullName || user.firstName || user.username || 'User',
    avatar: supabaseUser?.avatar_emoji || user.publicMetadata?.customAvatar || getDefaultAvatar(),
    avatarImage: supabaseUser?.avatar_url || user.imageUrl, // Cloudinary upload or Clerk's image
    email: user.primaryEmailAddress?.emailAddress,
    bio: supabaseUser?.bio || user.publicMetadata?.bio || 'Welcome to Lightning! Share your testimony to inspire others.',
    hasTestimony: testimony ? true : (supabaseUser?.has_testimony || false),
    testimony: testimony?.content || null,
    testimonyLesson: testimony?.lesson || null,
    location: supabaseUser?.location_city || user.publicMetadata?.location || null,
    profileCompleted: supabaseUser?.profile_completed || false,
    // Privacy settings
    isPrivate: supabaseUser?.is_private || false,
    testimonyVisibility: supabaseUser?.testimony_visibility || 'everyone',
    messagePrivacy: supabaseUser?.message_privacy || 'everyone',
    // Notification settings
    notifyMessages: supabaseUser?.notify_messages !== false,
    notifyFriendRequests: supabaseUser?.notify_friend_requests !== false,
    notifyNearby: supabaseUser?.notify_nearby !== false,
    // Search settings
    searchRadius: supabaseUser?.search_radius || 25,
    spotifyUrl: supabaseUser?.spotify_url || null,
    music: testimony ? {
      // If music URL is not set, use defaults with correct platform
      platform: testimony.music_spotify_url ? (testimony.music_platform || 'youtube') : 'youtube',
      trackName: testimony.music_track_name || "YOUR WAY'S BETTER",
      artist: testimony.music_artist || "Forrest Frank",
      spotifyUrl: testimony.music_spotify_url || "https://www.youtube.com/watch?v=T1LRsp8qBY0",
      audioUrl: testimony.music_audio_url || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      startTime: testimony.music_start_time || 0
    } : {
      // Always show default music player, even without testimony
      platform: 'youtube' as const,
      trackName: "YOUR WAY'S BETTER",
      artist: "Forrest Frank",
      spotifyUrl: supabaseUser?.spotify_url || "https://www.youtube.com/watch?v=T1LRsp8qBY0",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      startTime: 0
    },
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
    user // Original Clerk user object for advanced usage
  };
};
