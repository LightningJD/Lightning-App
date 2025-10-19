import { useUser } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { syncUserToSupabase, getUserByClerkId } from '../lib/database';

/**
 * Custom hook to sync Clerk user data with Lightning app profile
 */
export const useUserProfile = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const [supabaseUser, setSupabaseUser] = useState(null);

  // Sync user to Supabase when they sign in
  useEffect(() => {
    const syncUser = async () => {
      if (isLoaded && isSignedIn && user) {
        // Sync Clerk user to Supabase
        const dbUser = await syncUserToSupabase(user);
        setSupabaseUser(dbUser);
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
    username: user.username || user.emailAddresses[0]?.emailAddress.split('@')[0] || 'user',
    displayName: user.fullName || user.firstName || user.username || 'User',
    avatar: user.publicMetadata?.customAvatar || getDefaultAvatar(),
    avatarImage: user.imageUrl, // Keep Clerk's image URL for future use
    email: user.primaryEmailAddress?.emailAddress,
    bio: user.publicMetadata?.bio || 'Welcome to Lightning! Share your testimony to inspire others.',
    hasTestimony: user.publicMetadata?.hasTestimony || false,
    testimony: user.publicMetadata?.testimony || null,
    testimonyLesson: user.publicMetadata?.testimonyLesson || null,
    location: user.publicMetadata?.location || null,
    music: user.publicMetadata?.music || {
      trackName: "Amazing Grace",
      artist: "Various Artists",
      spotifyUrl: "https://open.spotify.com/track/1AWQoqb9bSvzTjaLralEka",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    },
    story: user.publicMetadata?.story || {
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
