import React from 'react';
import { MapPin } from 'lucide-react';

interface ProfileCardProps {
  nightMode: boolean;
  profile: {
    username?: string;
    displayName?: string;
    avatar?: string;
    avatarImage?: string;
    location?: string;
    churchName?: string;
    churchLocation?: string;
    denomination?: string;
    yearSaved?: number | null;
    isBaptized?: boolean;
    yearBaptized?: number | null;
    favoriteVerse?: string | null;
    favoriteVerseRef?: string | null;
    faithInterests?: string[];
    entryNumber?: number | null;
    story?: {
      id?: string | null;
      viewCount?: number;
      likeCount?: number;
      commentCount?: number;
    } | null;
  };
  /** Compact mode hides some sections for dialog use */
  compact?: boolean;
  /** Hide stats row */
  hideStats?: boolean;
  onAvatarClick?: () => void;
}

// Map of faith interest labels to emojis
const INTEREST_EMOJIS: Record<string, string> = {
  'Worship': '\ud83c\udfb5',
  'Bible Study': '\ud83d\udcd6',
  'Prayer': '\ud83d\ude4f',
  'Missions': '\u2708\ufe0f',
  'Youth Ministry': '\ud83d\udc65',
  'Apologetics': '\ud83c\udf99\ufe0f',
  'Evangelism': '\ud83d\udce3',
  'Discipleship': '\ud83c\udf31',
  'Serving': '\ud83e\uddf1',
  'Community': '\ud83e\udd1d',
  'Teaching': '\ud83c\udf93',
  'Creative Arts': '\ud83c\udfa8',
  'Music': '\ud83c\udfb6',
  'Small Groups': '\ud83c\udfe0',
  'Leadership': '\u2b50',
};

const ProfileCard: React.FC<ProfileCardProps> = ({
  nightMode,
  profile,
  compact = false,
  hideStats = false,
  onAvatarClick
}) => {
  const currentYear = new Date().getFullYear();
  const yearsWalking = profile.yearSaved ? currentYear - profile.yearSaved : null;
  const entryNum = profile.entryNumber ? `#${String(profile.entryNumber).padStart(4, '0')}` : null;

  const hasChurchInfo = profile.churchName;
  const hasVerse = profile.favoriteVerse && profile.favoriteVerseRef;
  const hasInterests = profile.faithInterests && profile.faithInterests.length > 0;
  const hasJourney = profile.yearSaved || profile.isBaptized;
  const hasStats = profile.story?.id && !hideStats;

  return (
    // Outer wrapper for glow border effect (V4)
    <div className="relative">
      {/* Glow border - gradient outline */}
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
        className={`relative rounded-2xl overflow-hidden ${
          nightMode ? '' : ''
        }`}
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
        {/* ═══ V4 HEADER: Centered avatar, name, location ═══ */}
        <div className="pt-6 pb-4 px-5 text-center">
          {/* Avatar */}
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto flex-shrink-0 overflow-hidden ${
              onAvatarClick ? 'cursor-pointer select-none' : ''
            }`}
            style={{
              background: nightMode
                ? 'linear-gradient(to bottom right, #87ceeb, #60a5fa, #3b82f6)'
                : 'linear-gradient(to bottom right, #c084fc, #ec4899)',
              border: nightMode ? '3px solid #0a0a0a' : '3px solid white',
            }}
            onClick={onAvatarClick}
          >
            {profile.avatarImage ? (
              <img
                src={profile.avatarImage}
                alt={profile.displayName || 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              profile.avatar || '\ud83d\udc64'
            )}
          </div>

          {/* Name + info */}
          <div className={`text-lg font-extrabold mt-3 ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {profile.username || 'user'}
          </div>
          <div className={`text-sm ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {profile.displayName || 'User'}
          </div>
          <div className={`text-xs mt-1 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {profile.location && (
              <span>\ud83d\udccd {profile.location}</span>
            )}
            {profile.location && profile.churchName && <span> \u2022 </span>}
            {profile.churchName && (
              <span>\u26ea {profile.churchName}</span>
            )}
          </div>

          {/* Divider */}
          <div className={`h-px my-4 ${nightMode ? 'bg-white/[0.08]' : 'bg-black/[0.06]'}`} />
        </div>

        {/* ═══ V11 STACKED SECTIONS + V15 VERSE ═══ */}
        <div className="px-4 pb-4 flex flex-col gap-3 -mt-2">

          {/* Church Section (V11 stacked glass) */}
          {hasChurchInfo && (
            <div
              className={`rounded-xl p-3 border ${
                nightMode
                  ? 'bg-white/[0.03] border-white/[0.06]'
                  : 'bg-white/30 border-white/40'
              }`}
              style={!nightMode ? {
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)',
              } : {}}
            >
              <div className={`text-[11px] font-bold uppercase tracking-wide mb-1.5 ${
                nightMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Church
              </div>
              <div className={`text-sm font-semibold ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
                \u26ea {profile.churchName}
              </div>
              {profile.churchLocation && (
                <div className={`text-xs mt-0.5 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  \ud83d\udccd {profile.churchLocation}
                </div>
              )}
              {profile.denomination && (
                <div className={`text-xs mt-0.5 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  \u271d\ufe0f {profile.denomination}
                </div>
              )}
            </div>
          )}

          {/* Favorite Verse Section (V15 style - left border accent) */}
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
                Verse
              </div>
              <div className={`text-[13px] italic leading-relaxed ${
                nightMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                "{profile.favoriteVerse}"
              </div>
              <div className={`text-xs font-semibold mt-2 ${
                nightMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                — {profile.favoriteVerseRef}
              </div>
            </div>
          )}

          {/* Faith Interests Section (V11 stacked glass) */}
          {hasInterests && (
            <div
              className={`rounded-xl p-3 border ${
                nightMode
                  ? 'bg-white/[0.03] border-white/[0.06]'
                  : 'bg-white/30 border-white/40'
              }`}
              style={!nightMode ? {
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)',
              } : {}}
            >
              <div className={`text-[11px] font-bold uppercase tracking-wide mb-2 ${
                nightMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Faith Interests
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.faithInterests!.map((interest, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                      nightMode
                        ? 'bg-[rgba(79,150,255,0.1)] border-[rgba(79,150,255,0.2)] text-[#93bbff]'
                        : 'bg-[rgba(59,130,246,0.08)] border-[rgba(59,130,246,0.2)] text-blue-700'
                    }`}
                  >
                    {INTEREST_EMOJIS[interest] || '\u2728'} {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Journey / Milestones Section (V11 stacked glass) */}
          {hasJourney && (
            <div
              className={`rounded-xl p-3 border ${
                nightMode
                  ? 'bg-white/[0.03] border-white/[0.06]'
                  : 'bg-white/30 border-white/40'
              }`}
              style={!nightMode ? {
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)',
              } : {}}
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
                    \ud83d\udcc5 Saved {profile.yearSaved}
                  </span>
                )}
                {profile.isBaptized && (
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${
                    nightMode
                      ? 'bg-white/5 border-white/10 text-slate-300'
                      : 'bg-white/25 border-white/30 text-slate-700'
                  }`}>
                    \ud83d\udca7 Baptized{profile.yearBaptized ? ` ${profile.yearBaptized}` : ''}
                  </span>
                )}
              </div>

              {/* Progress bar: Walk with Christ */}
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

          {/* Stats Section */}
          {hasStats && (
            <div className="flex gap-2">
              <StatBox nightMode={nightMode} value={profile.story?.viewCount || 0} label="Views" />
              <StatBox nightMode={nightMode} value={profile.story?.likeCount || 0} label="Likes" />
              <StatBox nightMode={nightMode} value={0} label="Prayers" />
              <StatBox nightMode={nightMode} value={profile.story?.commentCount || 0} label="Comments" />
            </div>
          )}

          {/* Footer: Entry number + Lightning branding */}
          <div className={`flex justify-between items-center pt-1 px-1`}>
            {entryNum && (
              <span className={`text-xs font-bold tracking-wide ${
                nightMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                \u26a1 Lightning Entry {entryNum}
              </span>
            )}
            <span className={`text-[11px] font-semibold ${
              nightMode ? 'text-white/20' : 'text-black/20'
            }`}>
              {!entryNum && '\u26a1 '}Lightning
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Stat Box sub-component ──
const StatBox: React.FC<{
  nightMode: boolean;
  value: number;
  label: string;
}> = ({ nightMode, value, label }) => (
  <div
    className={`flex-1 text-center py-2.5 px-1 rounded-xl border ${
      nightMode
        ? 'bg-white/[0.03] border-white/[0.06]'
        : 'bg-white/30 border-white/40'
    }`}
  >
    <div className={`text-base font-bold ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
      {value}
    </div>
    <div className={`text-[9px] font-medium uppercase tracking-wide mt-0.5 ${
      nightMode ? 'text-slate-500' : 'text-slate-400'
    }`}>
      {label}
    </div>
  </div>
);

export default ProfileCard;
