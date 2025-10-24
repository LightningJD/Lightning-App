import { useUser } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { syncUserToSupabase, getUserByClerkId, getTestimonyByUserId } from '../lib/database';

/**
 * Custom hook to sync Clerk user data with Lightning app profile
 */
export const useUserProfile = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [testimony, setTestimony] = useState(null);

  // Sync user to Supabase when they sign in
  useEffect(() => {
    const syncUser = async () => {
      if (isLoaded && isSignedIn && user) {
        // Sync Clerk user to Supabase
        const dbUser = await syncUserToSupabase(user);
        setSupabaseUser(dbUser);

        // Load testimony if user has one
        if (dbUser && dbUser.id) {
          const userTestimony = await getTestimonyByUserId(dbUser.id);
          setTestimony(userTestimony);
        }
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || !isSignedIn) {
    return {
      isLoading: !isLoaded,
      isAuthenticated: false,
      profile: null
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
    avatarImage: user.imageUrl, // Keep Clerk's image URL for future use
    email: user.primaryEmailAddress?.emailAddress,
    bio: supabaseUser?.bio || user.publicMetadata?.bio || 'Welcome to Lightning! Share your testimony to inspire others.',
    hasTestimony: testimony ? true : (supabaseUser?.has_testimony || false),
    testimony: testimony?.content || null,
    testimonyLesson: testimony?.lesson || null,
    location: supabaseUser?.location_city || user.publicMetadata?.location || null,
    profileCompleted: supabaseUser?.profile_completed || false,
    music: testimony ? {
      trackName: testimony.music_track_name || "Amazing Grace",
      artist: testimony.music_artist || "Various Artists",
      spotifyUrl: testimony.music_spotify_url || "https://open.spotify.com/track/1AWQoqb9bSvzTjaLralEka",
      audioUrl: testimony.music_audio_url || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    } : {
      trackName: "Amazing Grace",
      artist: "Various Artists",
      spotifyUrl: "https://open.spotify.com/track/1AWQoqb9bSvzTjaLralEka",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    },
    story: testimony ? {
      title: testimony.title || "My Testimony",
      content: testimony.content,
      lesson: testimony.lesson
    } : {
      title: "My Testimony",
      content: null,
      lesson: null
    }
  };

  return {
    isLoading: false,
    isAuthenticated: true,
    profile,
    user // Original Clerk user object for advanced usage
  };
};
