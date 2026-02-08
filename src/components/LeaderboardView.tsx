import React, { useState, useEffect } from 'react';
import { Trophy, Clock, TrendingUp } from 'lucide-react';
import { getLeaderboard, getCycleEndTime } from '../lib/database';

interface LeaderboardViewProps {
  nightMode: boolean;
  currentUserId: string;
}

const RANK_BADGES = ['🥇', '🥈', '🥉'];

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ nightMode, currentUserId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cycleEnd, setCycleEnd] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [lb, ce] = await Promise.all([
          getLeaderboard(currentUserId),
          getCycleEndTime()
        ]);
        setData(lb);
        setCycleEnd(ce);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUserId]);

  // Countdown timer
  useEffect(() => {
    if (!cycleEnd) return;

    const update = () => {
      const now = new Date();
      const diff = cycleEnd.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown('Resetting...');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`${days}d ${hours}h ${mins}m`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [cycleEnd]);

  const cardStyle = {
    background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.25)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: `1px solid ${nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.4)'}`,
    boxShadow: nightMode
      ? '0 4px 16px rgba(0,0,0,0.3)'
      : '0 4px 16px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,0.5)',
  };

  if (loading) {
    return (
      <div className="space-y-4 px-4">
        {[1, 2].map(i => (
          <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ ...cardStyle, height: 300 }} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const renderLeaderboardColumn = (
    title: string,
    emoji: string,
    entries: any[],
    type: 'bp' | 'op',
    personalRank: number | null,
    personalPoints: number,
    gapToTop7: number,
    gradientColors: { from: string; to: string; accent: string }
  ) => (
    <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
      {/* Column header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className={`text-sm font-bold ${nightMode ? 'text-white' : 'text-black'}`}>
            {title}
          </span>
        </div>
        {type === 'bp' && countdown && (
          <div className="flex items-center gap-1">
            <Clock className={`w-3 h-3 ${nightMode ? 'text-white/30' : 'text-black/30'}`} />
            <span className={`text-[10px] ${nightMode ? 'text-white/30' : 'text-black/30'}`}>
              {countdown}
            </span>
          </div>
        )}
      </div>

      {/* Rankings */}
      {entries.length === 0 ? (
        <div className={`text-center py-6 text-sm ${nightMode ? 'text-white/40' : 'text-black/40'}`}>
          No rankings yet. Be the first!
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry: any) => {
            const isMe = entry.user_id === currentUserId;
            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${
                  isMe ? 'ring-1' : ''
                }`}
                style={{
                  background: isMe
                    ? `linear-gradient(135deg, ${gradientColors.from}, ${gradientColors.to})`
                    : nightMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  ...(isMe ? { ringColor: gradientColors.accent } : {}),
                }}
              >
                {/* Rank */}
                <span className="text-base w-7 text-center">
                  {entry.rank <= 3 ? RANK_BADGES[entry.rank - 1] : (
                    <span className={`text-xs font-bold ${nightMode ? 'text-white/40' : 'text-black/40'}`}>
                      #{entry.rank}
                    </span>
                  )}
                </span>

                {/* Avatar */}
                {entry.avatar_url ? (
                  <img
                    src={entry.avatar_url}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-lg w-7 text-center">{entry.avatar_emoji || '👤'}</span>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold truncate ${
                    isMe
                      ? nightMode ? 'text-white' : 'text-black'
                      : nightMode ? 'text-white/80' : 'text-black/80'
                  }`}>
                    {entry.display_name || entry.username}
                    {isMe && <span className={`ml-1 text-[10px] ${nightMode ? 'text-white/50' : 'text-black/50'}`}>(You)</span>}
                  </div>
                </div>

                {/* Points */}
                <span className={`text-xs font-bold ${
                  nightMode ? 'text-white/60' : 'text-black/60'
                }`}>
                  {entry.points}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Personal rank (if not in top 7) */}
      {personalRank && personalRank > 7 && (
        <div
          className="mt-2 p-3 rounded-xl text-center"
          style={{
            background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1px dashed ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          }}
        >
          <div className={`text-xs ${nightMode ? 'text-white/50' : 'text-black/50'}`}>
            Your rank: <span className="font-bold">#{personalRank}</span> with <span className="font-bold">{personalPoints}</span> pts
          </div>
          {gapToTop7 > 0 && (
            <div className={`text-[10px] mt-1 flex items-center justify-center gap-1 ${nightMode ? 'text-white/30' : 'text-black/30'}`}>
              <TrendingUp className="w-3 h-3" />
              {gapToTop7} more signup{gapToTop7 !== 1 ? 's' : ''} to crack the top 7!
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 px-4">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 py-2">
        <Trophy className={`w-5 h-5 ${nightMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
        <h2 className={`text-lg font-bold ${nightMode ? 'text-white' : 'text-black'}`}>
          Ambassador Leaderboard
        </h2>
      </div>

      {/* BP Leaderboard */}
      {renderLeaderboardColumn(
        'Blessing Points',
        '✨',
        data.bp,
        'bp',
        data.personalBpRank,
        data.personalBp,
        data.gapToTop7Bp,
        {
          from: 'rgba(79, 150, 255, 0.15)',
          to: 'rgba(59, 130, 246, 0.08)',
          accent: 'rgba(79, 150, 255, 0.3)'
        }
      )}

      {/* OP Leaderboard */}
      {renderLeaderboardColumn(
        'Overall Points',
        '🏆',
        data.op,
        'op',
        data.personalOpRank,
        data.personalOp,
        data.gapToTop7Op,
        {
          from: 'rgba(168, 85, 247, 0.15)',
          to: 'rgba(139, 92, 246, 0.08)',
          accent: 'rgba(168, 85, 247, 0.3)'
        }
      )}

      {/* Info */}
      <div className={`text-center text-[10px] pb-4 ${nightMode ? 'text-white/25' : 'text-black/25'}`}>
        BP resets every 2 weeks. OP is permanent.
        <br />
        Earn points by inviting friends who complete their profile and testimony.
      </div>
    </div>
  );
};

export default LeaderboardView;
