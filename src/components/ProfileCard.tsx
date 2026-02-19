import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
}

// Map of faith interest labels to emojis
const INTEREST_EMOJIS: Record<string, string> = {
  'Worship': '🎵',
  'Bible Study': '📖',
  'Prayer': '🙏',
  'Missions': '✈️',
  'Youth Ministry': '👥',
  'Apologetics': '🎙️',
  'Evangelism': '📣',
  'Discipleship': '🌱',
  'Serving': '🧱',
  'Community': '🤝',
  'Teaching': '🎓',
  'Creative Arts': '🎨',
  'Music': '🎶',
  'Small Groups': '🏠',
  'Leadership': '⭐',
};

const ProfileCard: React.FC<ProfileCardProps> = ({
  nightMode,
  profile,
  compact = false,
  hideStats = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const currentYear = new Date().getFullYear();
  const yearsWalking = profile.yearSaved ? currentYear - profile.yearSaved : null;

  const hasChurchInfo = profile.churchName;
  const hasVerse = profile.favoriteVerse && profile.favoriteVerseRef;
  const hasInterests = profile.faithInterests && profile.faithInterests.length > 0;
  const hasJourney = profile.yearSaved || profile.isBaptized;
  const hasStats = profile.story?.id && !hideStats;
  const hasBio = profile.bio && profile.bio !== 'Welcome to Lightning! Share your testimony to inspire others.';
  const hasMusic = profile.music && profile.music.spotifyUrl;

  // Expandable sections: church, interests, journey
  const hasExpandable = hasChurchInfo || hasInterests || hasJourney;

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

          {/* Bio — Always visible */}
          {hasBio && (
            <p className="text-sm leading-relaxed" style={{
              color: nightMode ? '#8e89a8' : '#4a5e88',
            }}>
              {profile.bio}
            </p>
          )}

          {/* Favorite Verse — Always visible */}
          {hasVerse && (
            <div
              className="rounded-lg p-3"
              style={{
                background: nightMode ? 'rgba(123,118,224,0.05)' : 'rgba(79,172,254,0.05)',
                borderLeft: nightMode ? '2px solid #7b76e0' : '2px solid #4facfe',
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

          {/* Music Player — Always visible */}
          {hasMusic && (
            <MusicPlayer
              url={profile.music!.spotifyUrl!}
              trackName={profile.music!.trackName}
              artist={profile.music!.artist}
              nightMode={nightMode}
            />
          )}

          {/* Expand/Collapse trigger for church, interests, journey */}
          {hasExpandable && (
            <>
              {/* Expand button when collapsed */}
              {!expanded && (
                <button
                  onClick={() => setExpanded(true)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                    nightMode
                      ? 'text-slate-500 hover:text-slate-400'
                      : 'text-slate-400 hover:text-slate-500'
                  }`}
                >
                  {hasChurchInfo && <span>⛪ Church</span>}
                  {hasChurchInfo && (hasInterests || hasJourney) && <span>·</span>}
                  {hasInterests && <span>🙏 Interests</span>}
                  {hasInterests && hasJourney && <span>·</span>}
                  {hasJourney && <span>📅 Journey</span>}
                  <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                </button>
              )}

              {/* Expanded sections — V4 Compact Rows */}
              {expanded && (
                <>
                  {/* Divider */}
                  <div className="h-px" style={{ background: nightMode ? 'rgba(123,118,224,0.15)' : 'rgba(79,172,254,0.1)' }} />

                  <div className="flex flex-col">
                    {/* Church Row */}
                    {hasChurchInfo && (
                      <div className={`flex items-start gap-2.5 py-2.5 ${
                        (hasInterests || hasJourney) ? `border-b ${nightMode ? 'border-white/[0.04]' : 'border-black/[0.04]'}` : ''
                      }`}>
                        <span className="text-base leading-5 mt-px">⛪</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[13px] font-medium ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {profile.churchName}
                          </div>
                          {profile.denomination && (
                            <div className={`text-[11px] mt-0.5 ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              ✝️ {profile.denomination}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Faith Interests Row */}
                    {hasInterests && (
                      <div className={`flex items-start gap-2.5 py-2.5 ${
                        hasJourney ? `border-b ${nightMode ? 'border-white/[0.04]' : 'border-black/[0.04]'}` : ''
                      }`}>
                        <span className="text-base leading-5 mt-px">✨</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {profile.faithInterests!.map((interest, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border"
                                style={nightMode ? {
                                  background: 'rgba(123,118,224,0.1)',
                                  borderColor: 'rgba(123,118,224,0.2)',
                                  color: '#9b96f5',
                                } : {
                                  background: 'rgba(79,172,254,0.08)',
                                  borderColor: 'rgba(79,172,254,0.2)',
                                  color: '#2b6cb0',
                                }}
                              >
                                {INTEREST_EMOJIS[interest] || '✨'} {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Journey Row */}
                    {hasJourney && (
                      <div className="flex items-start gap-2.5 py-2.5">
                        <span className="text-base leading-5 mt-px">📖</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[13px] font-medium ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {profile.yearSaved && `Saved ${profile.yearSaved}`}
                            {profile.yearSaved && profile.isBaptized && ' · '}
                            {profile.isBaptized && `Baptized${profile.yearBaptized ? ` ${profile.yearBaptized}` : ''}`}
                          </div>
                          {yearsWalking !== null && yearsWalking > 0 && (
                            <div className="mt-2">
                              <div className="flex justify-between items-center text-[11px] mb-1">
                                <span className={nightMode ? 'text-slate-400' : 'text-slate-500'}>Saved for</span>
                                <span className="font-semibold" style={{ color: nightMode ? '#7b76e0' : '#2b6cb0' }}>
                                  {yearsWalking} {yearsWalking === 1 ? 'year' : 'years'}
                                </span>
                              </div>
                              <div className={`h-1 rounded-full overflow-hidden ${
                                nightMode ? 'bg-white/[0.06]' : 'bg-black/[0.06]'
                              }`}>
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, (yearsWalking / 50) * 100)}%`,
                                    background: nightMode
                                      ? 'linear-gradient(90deg, #7b76e0, #9b96f5)'
                                      : 'linear-gradient(90deg, #4facfe, #2b6cb0)',
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Collapse button */}
                  <button
                    onClick={() => setExpanded(false)}
                    className="flex items-center justify-center gap-1 py-1 text-[11px] font-medium rounded-lg transition-colors"
                    style={{ color: nightMode ? '#7b76e0' : '#2b6cb0' }}
                  >
                    Less <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </>
          )}

          {/* Stats - compact inline style */}
          {hasStats && (
            <div className="flex items-center justify-center gap-4 py-2 px-3 rounded-xl" style={{
              background: nightMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.4)',
              backdropFilter: nightMode ? undefined : 'blur(8px)',
              WebkitBackdropFilter: nightMode ? undefined : 'blur(8px)',
            }}>
              <StatItem nightMode={nightMode} value={profile.story?.viewCount || 0} label="Views" />
              <div className="w-px h-4" style={{ background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)' }} />
              <StatItem nightMode={nightMode} value={profile.story?.likeCount || 0} label="Likes" />
              <div className="w-px h-4" style={{ background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)' }} />
              <StatItem nightMode={nightMode} value={profile.story?.commentCount || 0} label="Comments" />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

const StatItem: React.FC<{
  nightMode: boolean;
  value: number;
  label: string;
}> = ({ nightMode, value, label }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-sm font-bold" style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a' }}>
      {value}
    </span>
    <span className="text-[10px] font-medium uppercase tracking-wide" style={{
      color: nightMode ? '#5d5877' : '#8e9ec0',
      opacity: 0.5,
    }}>
      {label}
    </span>
  </div>
);

export default ProfileCard;
