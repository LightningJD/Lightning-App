import React, { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { getLastCycleWinners, hasDismissedBpReset, dismissBpResetAnnouncement } from '../lib/database';

interface BpResetBannerProps {
  nightMode: boolean;
  userId: string;
}

const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

const BpResetBanner: React.FC<BpResetBannerProps> = ({ nightMode, userId }) => {
  const [visible, setVisible] = useState(false);
  const [winners, setWinners] = useState<any[]>([]);
  const [cycleId, setCycleId] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const result = await getLastCycleWinners();
        if (!result || result.winners.length === 0) return;

        const dismissed = await hasDismissedBpReset(userId, result.cycleId);
        if (dismissed) return;

        setCycleId(result.cycleId);
        setWinners(result.winners);
        setVisible(true);
      } catch (err) {
        console.error('Error checking BP reset banner:', err);
      }
    };

    check();
  }, [userId]);

  const handleDismiss = async () => {
    setVisible(false);
    if (cycleId) {
      await dismissBpResetAnnouncement(userId, cycleId);
    }
  };

  if (!visible || winners.length === 0) return null;

  return (
    <div className="px-4 mb-3">
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: nightMode
            ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(245, 158, 11, 0.08) 50%, rgba(255, 255, 255, 0.04) 100%)'
            : 'linear-gradient(135deg, rgba(254, 243, 199, 0.8) 0%, rgba(253, 230, 138, 0.5) 50%, rgba(255, 255, 255, 0.6) 100%)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: `1px solid ${nightMode ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.3)'}`,
          boxShadow: nightMode
            ? '0 4px 24px rgba(234, 179, 8, 0.15)'
            : '0 4px 24px rgba(234, 179, 8, 0.12)',
        }}
      >
        {/* Dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${
            nightMode ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/5 text-black/40'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Trophy className={`w-5 h-5 ${nightMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <span className={`text-sm font-bold ${nightMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
            Biweekly Top Ambassadors
          </span>
        </div>

        {/* Winners */}
        <div className="space-y-2 mb-4">
          {winners.map((winner: any, i: number) => (
            <div
              key={winner.user_id || i}
              className="flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{
                background: nightMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
              }}
            >
              <span className="text-xl">{RANK_EMOJIS[i] || `#${i + 1}`}</span>
              {winner.avatar_url ? (
                <img src={winner.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <span className="text-lg">{winner.avatar_emoji || '👤'}</span>
              )}
              <span className={`flex-1 text-sm font-semibold truncate ${nightMode ? 'text-white' : 'text-black'}`}>
                {winner.display_name || winner.username}
              </span>
              <span className={`text-xs font-bold ${nightMode ? 'text-yellow-400/70' : 'text-yellow-700'}`}>
                {winner.points} BP
              </span>
            </div>
          ))}
        </div>

        {/* Message */}
        <p className={`text-xs text-center ${nightMode ? 'text-white/40' : 'text-black/50'}`}>
          Blessing Points have been reset! A new cycle has begun.
        </p>
      </div>
    </div>
  );
};

export default BpResetBanner;
