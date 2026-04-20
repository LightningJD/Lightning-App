import React from 'react';
import MusicPlayer from './MusicPlayer';

interface ProfileCardProps {
  nightMode: boolean;
  profile: {
    bio?: string | null;
    username?: string | null;
    churchName?: string | null;
    location?: string | null;
    favoriteVerse?: string | null;
    favoriteVerseRef?: string | null;
    music?: {
      spotifyUrl?: string;
      trackName?: string;
      artist?: string;
    } | null;
    story?: {
      id?: string | null;
      viewCount?: number;
      likeCount?: number;
      commentCount?: number;
    } | null;
  };
  compact?: boolean;
  hideStats?: boolean;
  onShareTestimony?: () => void;
  onEditProfile?: () => void;
  isOwnProfile?: boolean;
  /** Testimony content rendered in the tinted section */
  children?: React.ReactNode;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  nightMode,
  profile,
  onShareTestimony,
  onEditProfile,
  isOwnProfile = false,
  children,
}) => {
  const hasMusic = profile.music && profile.music.spotifyUrl;
  const hasIdentity = profile.username || profile.churchName || profile.location;
  const viewCount = profile.story?.viewCount || 0;
  const hasTestimonyContent = !!children;

  return (
    <div className="relative">
      {/* Glow border */}
      <div
        className="absolute inset-[-1px] rounded-[17px] pointer-events-none"
        style={{
          padding: '1px',
          background: nightMode
            ? 'linear-gradient(135deg, rgba(123,118,224,0.3), rgba(91,86,204,0.15), rgba(155,150,245,0.2))'
            : 'linear-gradient(135deg, rgba(79,172,254,0.25), rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude' as any,
        }}
      />

      {/* Main card */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={nightMode ? {
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        } : {
          background: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(150,165,225,0.15)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 2px 10px rgba(150,165,225,0.07)',
        }}
      >
        {/* Top section: header + identity + music */}
        <div className="px-3.5 py-3 flex flex-col gap-2">
          {/* Card Header */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest" style={{
              color: nightMode ? '#7b76e0' : '#4facfe',
            }}>
              ⚡ Lightning Profile
            </span>
            <div className="flex-1 h-px" style={{
              background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)',
            }} />
          </div>

          {/* Identity Block */}
          {hasIdentity && (
            <div className="flex items-center gap-3">
              {/* Church icon */}
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{
                  background: nightMode
                    ? 'linear-gradient(135deg, rgba(123,118,224,0.15), rgba(155,150,245,0.1))'
                    : 'linear-gradient(135deg, rgba(79,172,254,0.15), rgba(139,92,246,0.1))',
                }}
              >
                <span className="text-base">⛪</span>
              </div>
              <div className="flex-1 min-w-0">
                {profile.username && (
                  <div className="text-[13px] font-semibold" style={{
                    color: nightMode ? '#e8e5f2' : '#1e2b4a',
                    letterSpacing: '-0.1px',
                  }}>
                    @{profile.username}
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  {profile.churchName && (
                    <span className="text-[11px]" style={{
                      color: nightMode ? '#8e89a8' : '#8e9ec0',
                    }}>
                      {profile.churchName}
                    </span>
                  )}
                  {profile.churchName && profile.location && (
                    <span
                      className="w-[3px] h-[3px] rounded-full flex-shrink-0"
                      style={{ background: nightMode ? '#5d5877' : '#c4cfe6' }}
                    />
                  )}
                  {profile.location && (
                    <span className="text-[11px]" style={{
                      color: nightMode ? '#8e89a8' : '#8e9ec0',
                    }}>
                      {profile.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Music Player */}
          {hasMusic && (
            <MusicPlayer
              url={profile.music!.spotifyUrl!}
              trackName={profile.music!.trackName}
              artist={profile.music!.artist}
              nightMode={nightMode}
            />
          )}
        </div>

        {/* Middle section: testimony (tinted background) */}
        {hasTestimonyContent && (
          <div
            className="px-3.5 py-3"
            style={{
              background: nightMode ? 'rgba(123,118,224,0.03)' : 'rgba(79,172,254,0.03)',
              borderTop: nightMode
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(150,165,225,0.1)',
            }}
          >
            {children}
          </div>
        )}

        {/* Footer bar: view count + compact action buttons */}
        {isOwnProfile && (
          <div
            className="px-3.5 py-2.5 flex items-center justify-between"
            style={{
              borderTop: nightMode
                ? '1px solid rgba(255,255,255,0.05)'
                : '1px solid rgba(150,165,225,0.08)',
            }}
          >
            {/* View count */}
            <span style={{
              fontSize: '11px',
              color: nightMode ? '#5d5877' : '#8e9ec0',
            }}>
              {viewCount > 0 ? `⦿ ${viewCount}` : ''}
            </span>

            {/* Compact buttons */}
            <div className="flex gap-1.5">
              {profile.story?.id && onShareTestimony && (
                <button
                  onClick={onShareTestimony}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={{
                    background: nightMode ? 'rgba(123,118,224,0.1)' : 'rgba(79,172,254,0.1)',
                    border: nightMode ? '1px solid rgba(123,118,224,0.15)' : '1px solid rgba(79,172,254,0.15)',
                    color: nightMode ? '#9b96f5' : '#2b6cb0',
                  }}
                >
                  ⚡ Share
                </button>
              )}
              {onEditProfile && (
                <button
                  onClick={onEditProfile}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={nightMode ? {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#8e89a8',
                  } : {
                    background: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(150,165,225,0.15)',
                    color: '#64748b',
                  }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;
