import { useUser, useSession } from '@clerk/clerk-react';
import { useEffect, useState, useRef } from 'react';
import { syncUserToSupabase, getTestimonyByUserId, getChurchById } from '../lib/database';
import { setClerkTokenGetter } from '../lib/supabase';
import { getCachedProfile, cacheProfile } from '../lib/profileCache';


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
  const [church, setChurch] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(true);
  const [hasCache, setHasCache] = useState(false);
  const tokenGetterSet = useRef(false);

  // Register Clerk token getter for native Supabase integration
  // This lets the module-level Supabase client automatically include
  // the Clerk JWT on every request (for RLS)
  useEffect(() => {
    if (session && !tokenGetterSet.current) {
      setClerkTokenGetter(() => session.getToken());
      tokenGetterSet.current = true;
      console.log('✅ Clerk token getter registered for Supabase native integration');
    }
  }, [session]);

  // Load cached profile immediately for instant display
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const cached = getCachedProfile(user.id);
    if (cached) {
      setSupabaseUser(cached.supabaseUser);
      setTestimony(cached.testimony);
      setChurch(cached.church);
      setHasCache(true);
      setIsSyncing(false); // Show UI immediately with cached data
    }
  }, [isLoaded, isSignedIn, user]);

  // Sync user to Supabase when they sign in or when refresh is triggered
  useEffect(() => {
    let completed = false;

    const syncUser = async () => {
      // Wait for Clerk to load
      if (!isLoaded) return;

      if (isSignedIn && user && session) {
        // If we have cache, don't show loading state
        if (!hasCache) {
          setIsSyncing(true);
        }
        // Ensure Clerk token getter is registered before any Supabase calls
        // to avoid the race condition where this effect fires before the
        // token registration effect, causing RLS failures.
        if (!tokenGetterSet.current) {
          setClerkTokenGetter(() => session.getToken());
          tokenGetterSet.current = true;
        }

        try {
          // Sync Clerk user to Supabase
          // @ts-ignore - Clerk user type compatibility
          const dbUser = await syncUserToSupabase(user);
          setSupabaseUser(dbUser);

          // Load testimony and church in parallel for faster loading
          if (dbUser && dbUser.id) {
            const [userTestimony, churchData] = await Promise.all([
              getTestimonyByUserId(dbUser.id),
              (dbUser as any).church_id ? getChurchById((dbUser as any).church_id) : Promise.resolve(null)
            ]);

            if (userTestimony) {
              console.log('✅ Testimony loaded:', userTestimony.id);
              setTestimony(userTestimony);
            } else {
              console.log('ℹ️ No testimony found for user:', dbUser.id);
              setTestimony(null);
            }

            if (churchData) {
              console.log('✅ Church loaded:', churchData.name);
              setChurch(churchData);
            } else {
              setChurch(null);
            }

            // Cache the profile for instant load next time
            cacheProfile(user.id, {
              supabaseUser: dbUser,
              testimony: userTestimony,
              church: churchData
            });
          } else {
            console.error('❌ Sync failed: No Database User returned from syncUserToSupabase');
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('❌ Error syncing user profile:', message);
        } finally {
          completed = true;
          setIsSyncing(false);
        }
      } else if (!isSignedIn) {
        // Definitely not signed in — stop loading
        completed = true;
        setIsSyncing(false);
      }
      // If signed in but session/user not ready yet, keep isSyncing true
      // and wait for the dependency change to re-trigger, or the safety timeout.
    };

    syncUser();

    // Safety timeout: if sync hangs (network issue, Supabase down, token hang, etc.)
    // force the loading screen to dismiss after 10 seconds so the app is still usable
    const timeoutId = setTimeout(() => {
      if (!completed) {
        console.warn('⚠️ Profile sync timed out after 10s — loading app without full profile data');
        setIsSyncing(false);
      }
    }, 10_000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isLoaded, isSignedIn, user, session, refreshTrigger, hasCache]);

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
      pull_quote: testimony.pull_quote || null,
      lesson: testimony.lesson,
      viewCount: testimony.view_count || 0,
      likeCount: testimony.like_count || 0
    } : {
      id: null,
      title: "My Testimony",
      content: null,
      pull_quote: null,
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
