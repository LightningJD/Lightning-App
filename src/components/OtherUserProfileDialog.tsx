import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useUserProfile } from './useUserProfile';
import { getUserById, getTestimonyByUserId, getChurchById } from '../lib/database';
import ProfileTab from './ProfileTab';

interface User {
  id: string;
  displayName?: string;
  display_name?: string;
  username?: string;
  avatar?: string;
  avatarImage?: string;
  avatar_url?: string;
  avatar_emoji?: string;
  location?: string;
  location_city?: string;
  distance?: string;
  online?: boolean;
  is_online?: boolean;
  bio?: string;
  story?: any;
  mutualFriends?: number;
  music?: any;
  churchName?: string;
  churchLocation?: string;
  denomination?: string;
  yearSaved?: number;
  isBaptized?: boolean;
  yearBaptized?: number;
  favoriteVerse?: string;
  favoriteVerseRef?: string;
  faithInterests?: string[];
  entryNumber?: number;
}

interface OtherUserProfileDialogProps {
  user: User | null;
  onClose: () => void;
  nightMode: boolean;
  onMessage: (user: any) => void;
}

/**
 * Thin wrapper that renders the same ProfileTab used on the "You" page,
 * but for another user. Fetches their full profile from DB, shows a
 * back button header, and passes onMessage so ProfileTab renders the
 * social action buttons (Message, Add Friend, Follow, Report, Block).
 */
const OtherUserProfileDialog: React.FC<OtherUserProfileDialogProps> = ({
  user: rawUser,
  onClose,
  nightMode,
  onMessage
}) => {
  const user = React.useMemo(() => {
    if (!rawUser) return null;
    return {
      ...rawUser,
      displayName: rawUser.displayName || rawUser.display_name || rawUser.username || 'User',
      avatarImage: rawUser.avatarImage || rawUser.avatar_url,
      avatar: rawUser.avatar || rawUser.avatar_emoji || '👤',
      online: rawUser.online ?? rawUser.is_online ?? false,
      location: rawUser.location || rawUser.location_city,
    };
  }, [rawUser]);

  const { profile: currentUserProfile } = useUserProfile();
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [testimony, setTestimony] = useState<any>(null);
  const [church, setChurch] = useState<any>(null);

  // Fetch full profile data from DB
  useEffect(() => {
    const loadFullProfile = async () => {
      if (!user?.id) return;
      try {
        const [dbUser, userTestimony] = await Promise.all([
          getUserById(user.id),
          getTestimonyByUserId(user.id),
        ]);
        if (dbUser) {
          setFullProfile(dbUser);
          if ((dbUser as any).church_id) {
            const churchData = await getChurchById((dbUser as any).church_id);
            if (churchData) setChurch(churchData);
          }
        }
        if (userTestimony) setTestimony(userTestimony);
      } catch (err) {
        console.error('Error loading full profile:', err);
      }
    };
    loadFullProfile();
  }, [user?.id]);

  if (!user) return null;

  // Build profile object matching what ProfileTab expects
  const fp = fullProfile || {};
  const profileForTab = {
    supabaseId: user.id,
    username: fp.username || user.username || user.displayName,
    displayName: fp.display_name || user.displayName,
    avatar: fp.avatar_emoji || user.avatar,
    avatarImage: fp.avatar_url || user.avatarImage,
    location: fp.location_city || user.location,
    bio: (() => {
      const bio = fp.bio || user.bio;
      const defaultBio = 'Welcome to Lightning! Share your testimony to inspire others.';
      return bio && bio !== defaultBio ? bio : undefined;
    })(),
    churchName: fp.church_name || user.churchName || church?.name,
    churchLocation: fp.church_location || user.churchLocation || church?.location,
    denomination: fp.denomination || user.denomination || church?.denomination,
    yearSaved: fp.year_saved || user.yearSaved,
    isBaptized: fp.is_baptized || user.isBaptized,
    yearBaptized: fp.year_baptized || user.yearBaptized,
    favoriteVerse: fp.favorite_verse || user.favoriteVerse,
    favoriteVerseRef: fp.favorite_verse_ref || user.favoriteVerseRef,
    faithInterests: fp.faith_interests || user.faithInterests,
    music: fp.spotify_url ? {
      platform: 'youtube' as const,
      spotifyUrl: fp.spotify_url,
      trackName: fp.song_name || 'My Song',
      artist: fp.song_artist || '',
    } : user.music,
    story: testimony ? {
      id: testimony.id,
      title: testimony.title,
      content: testimony.content,
      lesson: testimony.lesson,
      viewCount: testimony.view_count || 0,
      likeCount: testimony.like_count || 0,
    } : user.story ? {
      id: user.story.id,
      title: user.story.title,
      content: user.story.content,
      lesson: user.story.lesson,
      viewCount: 0,
      likeCount: user.story.likeCount || 0,
    } : undefined,
    church: church || undefined,
  };

  // App theme gradients (match AppLayout)
  const darkGradient = `linear-gradient(135deg, rgba(17, 24, 39, 0.42) 0%, transparent 100%),
                        radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.035) 0%, transparent 60%),
                        linear-gradient(45deg, #0a0a0a 0%, #15121c 50%, #191e27 100%)`;
  const lightGradient = `linear-gradient(135deg, rgba(219, 234, 254, 0.63) 0%, transparent 100%),
                         radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.175) 0%, transparent 60%),
                         linear-gradient(45deg, #E8F3FE 0%, #EAE5FE 50%, #D9CDFE 100%)`;

  return (
    <div
      className="fixed inset-0 z-[55] flex flex-col animate-in slide-in-from-right duration-300"
      style={{ background: nightMode ? darkGradient : lightGradient }}
      role="dialog"
      aria-modal="true"
    >
      {/* Header — matches app header style */}
      <div className={`flex-shrink-0 backdrop-blur-xl border-b ${nightMode ? 'bg-black/10 border-white/10' : 'bg-white/10 border-white/20'}`}>
        <div className="px-5 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className={`flex items-center gap-1.5 -ml-1 py-1 rounded-lg transition-colors ${nightMode ? 'text-slate-100 hover:text-white' : 'text-black hover:text-black/80'}`}
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold text-xl">Back</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content — THE SAME ProfileTab component used on the You page */}
      <div className="flex-1 overflow-y-auto">
        <ProfileTab
          profile={profileForTab}
          nightMode={nightMode}
          currentUserProfile={currentUserProfile}
          onMessage={onMessage}
          onBlocked={onClose}
        />
      </div>
    </div>
  );
};

export default OtherUserProfileDialog;
