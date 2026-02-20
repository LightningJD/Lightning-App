import React from 'react';
import MusicPlayer from './MusicPlayer';

interface ProfileCardProps {
  nightMode: boolean;
  profile: {
    bio?: string | null;
    churchName?: string;
    churchLocation?: string;
    denomination?: string;
    yearSaved?: number | null;
    isBaptized?: boolean;
    yearBaptized?: number | null;
    favoriteVerse?: string | null;
    favoriteVerseRef?: string | null;
    faithInterests?: string[];
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
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  nightMode,
  profile,
  onShareTestimony,
  onEditProfile,
  isOwnProfile = false,
}) => {
  const hasVerse = profile.favoriteVerse && profile.favoriteVerseRef;
  const hasBio = profile.bio && profile.bio !== 'Welcome to Lightning! Share your testimony to inspire others.';
  const hasMusic = profile.music && profile.music.spotifyUrl;
  const viewCount = profile.story?.viewCount || 0;

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
        <div className="p-4 flex flex-col gap-3">

          {/* Card Header */}
          <div className="flex items-center gap-2 pb-1">
            <span className="text-xs font-bold uppercase tracking-widest" style={{
              color: nightMode ? '#7b76e0' : '#4facfe',
            }}>
              ⚡ Lightning Profile
            </span>
            <div className="flex-1 h-px" style={{
              background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)',
            }} />
          </div>

          {/* Bio — centered */}
          {hasBio && (
            <p className="text-sm leading-relaxed text-center" style={{
              color: nightMode ? '#8e89a8' : '#4a5e88',
            }}>
              {profile.bio}
            </p>
          )}

          {/* Favorite Verse */}
          {hasVerse && (
            <div
              className="rounded-lg p-3"
              style={{
                background: nightMode ? 'rgba(123,118,224,0.05)' : 'rgba(79,172,254,0.05)',
                borderLeft: nightMode ? '3px solid #7b76e0' : '3px solid #4facfe',
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{
                color: nightMode ? '#5d5877' : '#8e9ec0',
              }}>
                Favorite Verse
              </div>
              <div className="text-[13px] italic leading-relaxed" style={{
                fontFamily: "'Playfair Display', serif",
                color: nightMode ? '#b8b4c8' : '#3a4d6e',
              }}>
                &ldquo;{profile.favoriteVerse}&rdquo;
              </div>
              <div className="text-[11px] font-semibold mt-2" style={{
                color: nightMode ? '#7b76e0' : '#2b6cb0',
              }}>
                — {profile.favoriteVerseRef}
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

          {/* Action Buttons — Share Testimony + Edit Profile */}
          {isOwnProfile && (
            <div className="flex gap-2">
              {profile.story?.id && onShareTestimony && (
                <button
                  onClick={onShareTestimony}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-center transition-colors"
                  style={{
                    background: nightMode ? 'rgba(123,118,224,0.12)' : 'rgba(79,172,254,0.12)',
                    border: nightMode ? '1px solid rgba(123,118,224,0.2)' : '1px solid rgba(79,172,254,0.2)',
                    color: nightMode ? '#9b96f5' : '#2b6cb0',
                  }}
                >
                  ⚡ Share Testimony
                </button>
              )}
              {onEditProfile && (
                <button
                  onClick={onEditProfile}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-center transition-colors"
                  style={nightMode ? {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#8e89a8',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  } : {
                    background: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(150,165,225,0.15)',
                    color: '#4a5e88',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                >
                  Edit Profile
                </button>
              )}
            </div>
          )}

          {/* Subtle views */}
          {viewCount > 0 && (
            <div className="text-center" style={{
              fontSize: '11px',
              color: nightMode ? '#8e89a8' : '#4a5e88',
              opacity: 0.45,
              letterSpacing: '0.3px',
            }}>
              ⦿ {viewCount} views
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
