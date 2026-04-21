import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getUserByUsername, getTestimonyByUserId, getChurchById } from '../lib/database';
import { useAppContext } from '../contexts/AppContext';
import { useUserProfile } from '../components/useUserProfile';
import ProfileTab from '../components/ProfileTab';

const UserProfilePage: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { nightMode, themes, selectedTheme } = useAppContext();
  const { profile: currentUserProfile } = useUserProfile();
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [testimony, setTestimony] = useState<any>(null);
  const [church, setChurch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!handle) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const load = async () => {
      const dbUser = await getUserByUsername(handle);
      if (!dbUser) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const [userTestimony, churchData] = await Promise.all([
        getTestimonyByUserId(dbUser.id),
        (dbUser as any).church_id
          ? getChurchById((dbUser as any).church_id)
          : Promise.resolve(null),
      ]);

      setFullProfile(dbUser);
      if (userTestimony) setTestimony(userTestimony);
      if (churchData) setChurch(churchData);
      setLoading(false);
    };

    load().catch(() => {
      setNotFound(true);
      setLoading(false);
    });
  }, [handle]);

  const currentTheme = themes[selectedTheme];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{
            borderColor: nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderTopColor: nightMode ? '#7b76e0' : '#4facfe',
          }}
        />
      </div>
    );
  }

  if (notFound || !fullProfile) {
    return (
      <div className="flex-1 flex flex-col" data-testid="not-found">
        <div className={`flex-shrink-0 backdrop-blur-xl border-b ${nightMode ? 'bg-black/10 border-white/10' : 'bg-white/10 border-white/20'}`}>
          <div className="px-5 py-3">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center gap-1.5 -ml-1 py-1 rounded-lg transition-colors ${nightMode ? 'text-slate-100 hover:text-white' : 'text-black hover:text-black/80'}`}
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold text-xl">Back</span>
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className={`text-sm ${nightMode ? 'text-white/40' : 'text-black/40'}`}>
              Profile not found
            </p>
            <button
              onClick={() => navigate('/')}
              className={`mt-3 px-4 py-2 rounded-lg text-sm ${nightMode ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-black/5 text-black/60 hover:bg-black/10'}`}
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Build profile object matching what ProfileTab expects (same mapping as OtherUserProfileDialog)
  const profileForTab = {
    supabaseId: fullProfile.id,
    username: fullProfile.username,
    displayName: fullProfile.display_name || fullProfile.username,
    avatar: fullProfile.avatar_emoji || '👤',
    avatarImage: fullProfile.avatar_url || null,
    location: fullProfile.location_city,
    bio: (() => {
      const bio = fullProfile.bio;
      const defaultBio = 'Welcome to Lightning! Share your testimony to inspire others.';
      return bio && bio !== defaultBio ? bio : undefined;
    })(),
    churchName: fullProfile.church_name || church?.name,
    churchLocation: fullProfile.church_location || church?.location,
    denomination: fullProfile.denomination || church?.denomination,
    yearSaved: fullProfile.year_saved,
    isBaptized: fullProfile.is_baptized,
    yearBaptized: fullProfile.year_baptized,
    favoriteVerse: fullProfile.favorite_verse,
    favoriteVerseRef: fullProfile.favorite_verse_ref,
    faithInterests: fullProfile.faith_interests,
    music: fullProfile.spotify_url ? {
      platform: 'youtube' as const,
      spotifyUrl: fullProfile.spotify_url,
      trackName: (fullProfile as any).song_name || 'My Song',
      artist: (fullProfile as any).song_artist || '',
    } : undefined,
    story: testimony ? {
      id: testimony.id,
      title: testimony.title,
      content: testimony.content,
      lesson: testimony.lesson,
      pull_quote: testimony.pull_quote,
      viewCount: testimony.view_count || 0,
      likeCount: testimony.like_count || 0,
    } : undefined,
    church: church || undefined,
  };

  return (
    <div
      className="h-screen w-screen flex flex-col"
      style={{ background: nightMode ? currentTheme?.darkGradient : currentTheme?.lightGradient }}
      data-testid="user-profile"
    >
      <div className={`flex-shrink-0 backdrop-blur-xl border-b ${nightMode ? 'bg-black/10 border-white/10' : 'bg-white/10 border-white/20'}`}>
        <div className="px-5 py-3">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-1.5 -ml-1 py-1 rounded-lg transition-colors ${nightMode ? 'text-slate-100 hover:text-white' : 'text-black hover:text-black/80'}`}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-xl">Back</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ProfileTab
          profile={profileForTab}
          nightMode={nightMode}
          currentUserProfile={currentUserProfile}
          onMessage={() => navigate('/')}
        />
      </div>
    </div>
  );
};

export default UserProfilePage;
