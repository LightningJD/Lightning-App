import React from 'react';

interface ProfileCardProps {
  nightMode: boolean;
  profile: {
    churchName?: string;
    churchLocation?: string;
    denomination?: string;
    yearSaved?: number | null;
    isBaptized?: boolean;
    yearBaptized?: number | null;
    favoriteVerse?: string | null;
    favoriteVerseRef?: string | null;
    faithInterests?: string[];
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
  const currentYear = new Date().getFullYear();
  const yearsWalking = profile.yearSaved ? currentYear - profile.yearSaved : null;

  const hasChurchInfo = profile.churchName;
  const hasVerse = profile.favoriteVerse && profile.favoriteVerseRef;
  const hasInterests = profile.faithInterests && profile.faithInterests.length > 0;
  const hasJourney = profile.yearSaved || profile.isBaptized;
  const hasStats = profile.story?.id && !hideStats;

  return (
    <div className="relative">
      {/* Glow border */}
      <div
        className="absolute inset-[-1px] rounded-[17px] pointer-events-none"
        style={{
          padding: '1px',
          background: 'linear-gradient(135deg, #4faaf8, #3b82f6, #2563eb, #8b5cf6)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude' as any,
          opacity: nightMode ? 0.5 : 0.35,
        }}
      />

      {/* Main card */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={nightMode ? {
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
        } : {
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05), inset 0 1px 2px rgba(255,255,255,0.4)',
        }}
      >
        <div className="p-4 flex flex-col gap-3">

          {/* Card Header */}
          <div className="flex items-center gap-2 pb-1">
            <span className={`text-xs font-bold uppercase tracking-widest ${
              nightMode ? 'text-blue-400' : 'text-blue-600'
            }`}>
              ⚡ Faith Profile
            </span>
            <div className={`flex-1 h-px ${nightMode ? 'bg-white/[0.08]' : 'bg-black/[0.06]'}`} />
          </div>

          {/* Church Section */}
          {hasChurchInfo && (
            <div
              className={`rounded-xl p-3 border ${
                nightMode
                  ? 'bg-white/[0.03] border-white/[0.06]'
                  : 'bg-white/30 border-white/40'
              }`}
              style={!nightMode ? { boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)' } : {}}
            >
              <div className={`text-[11px] font-bold uppercase tracking-wide mb-1.5 ${
                nightMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Church
              </div>
              <div className={`text-sm font-semibold ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
                ⛪ {profile.churchName}
              </div>
              {profile.churchLocation && (
                <div className={`text-xs mt-0.5 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  📍 {profile.churchLocation}
                </div>
              )}
              {profile.denomination && (
                <div className={`text-xs mt-0.5 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  ✝️ {profile.denomination}
                </div>
              )}
            </div>
          )}

          {/* Favorite Verse (V15 style - left border accent) */}
          {hasVerse && (
            <div
              className="rounded-xl p-4"
              style={{
                background: nightMode ? 'rgba(79,150,255,0.06)' : 'rgba(59,130,246,0.05)',
                borderLeft: nightMode ? '3px solid #4faaf8' : '3px solid #3b82f6',
              }}
            >
              <div className={`text-[11px] font-bold uppercase tracking-wide mb-2 ${
                nightMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Favorite Verse
              </div>
              <div className={`text-[13px] italic leading-relaxed ${
                nightMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                &ldquo;{profile.favoriteVerse}&rdquo;
              </div>
              <div className={`text-xs font-semibold mt-2 ${
                nightMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                — {profile.favoriteVerseRef}
              </div>
            </div>
          )}

          {/* Faith Interests */}
          {hasInterests && (
            <div
              className={`rounded-xl p-3 border ${
                nightMode
                  ? 'bg-white/[0.03] border-white/[0.06]'
                  : 'bg-white/30 border-white/40'
              }`}
              style={!nightMode ? { boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)' } : {}}
            >
              <div className={`text-[11px] font-bold uppercase tracking-wide mb-2.5 ${
                nightMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Faith Interests
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.faithInterests!.map((interest, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                      nightMode
                        ? 'bg-[rgba(79,150,255,0.1)] border-[rgba(79,150,255,0.2)] text-[#93bbff]'
                        : 'bg-[rgba(59,130,246,0.08)] border-[rgba(59,130,246,0.2)] text-blue-700'
                    }`}
                  >
                    {INTEREST_EMOJIS[interest] || '✨'} {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Journey / Milestones */}
          {hasJourney && (
            <div
              className={`rounded-xl p-3 border ${
                nightMode
                  ? 'bg-white/[0.03] border-white/[0.06]'
                  : 'bg-white/30 border-white/40'
              }`}
              style={!nightMode ? { boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)' } : {}}
            >
              <div className={`text-[11px] font-bold uppercase tracking-wide mb-2 ${
                nightMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Journey
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.yearSaved && (
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${
                    nightMode
                      ? 'bg-white/5 border-white/10 text-slate-300'
                      : 'bg-white/25 border-white/30 text-slate-700'
                  }`}>
                    📅 Saved {profile.yearSaved}
                  </span>
                )}
                {profile.isBaptized && (
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${
                    nightMode
                      ? 'bg-white/5 border-white/10 text-slate-300'
                      : 'bg-white/25 border-white/30 text-slate-700'
                  }`}>
                    💧 Baptized{profile.yearBaptized ? ` ${profile.yearBaptized}` : ''}
                  </span>
                )}
              </div>

              {yearsWalking !== null && yearsWalking > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className={nightMode ? 'text-slate-400' : 'text-slate-500'}>Walk with Christ</span>
                    <span className={`font-semibold ${nightMode ? 'text-blue-400' : 'text-blue-600'}`}>
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
                        background: 'linear-gradient(90deg, #4faaf8, #2563eb)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats - compact inline style */}
          {hasStats && (
            <div className={`flex items-center justify-center gap-4 py-2 px-3 rounded-xl ${
              nightMode ? 'bg-white/[0.03]' : 'bg-white/20'
            }`}>
              <StatItem nightMode={nightMode} value={profile.story?.viewCount || 0} label="Views" />
              <div className={`w-px h-4 ${nightMode ? 'bg-white/10' : 'bg-black/10'}`} />
              <StatItem nightMode={nightMode} value={profile.story?.likeCount || 0} label="Likes" />
              <div className={`w-px h-4 ${nightMode ? 'bg-white/10' : 'bg-black/10'}`} />
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
    <span className={`text-sm font-bold ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
      {value}
    </span>
    <span className={`text-[10px] font-medium uppercase tracking-wide ${
      nightMode ? 'text-slate-500' : 'text-slate-400'
    }`}>
      {label}
    </span>
  </div>
);

export default ProfileCard;
