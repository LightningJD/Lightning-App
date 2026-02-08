import React, { useState, useEffect } from 'react';
import { Copy, Share2, Users, Trophy, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getReferralStats,
  getUserPoints,
  getCycleEndTime,
  acceptAmbassadorTerms,
  hasAcceptedAmbassadorTerms
} from '../lib/database';
import AmbassadorTermsModal from './AmbassadorTermsModal';

interface MyReferralSectionProps {
  nightMode: boolean;
  userId: string;
  username: string;
}

const MyReferralSection: React.FC<MyReferralSectionProps> = ({ nightMode, userId, username }) => {
  const [stats, setStats] = useState<{ code: string | null; totalReferred: number; confirmed: number; pending: number }>({
    code: null, totalReferred: 0, confirmed: 0, pending: 0
  });
  const [points, setPoints] = useState({ bp: 0, op: 0 });
  const [cycleEnd, setCycleEnd] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, p, ce, accepted] = await Promise.all([
          getReferralStats(userId),
          getUserPoints(userId),
          getCycleEndTime(),
          hasAcceptedAmbassadorTerms(userId)
        ]);
        setStats(s);
        setPoints(p);
        setCycleEnd(ce);
        setTermsAccepted(accepted);
      } catch (err) {
        console.error('Error loading referral data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

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

  const referralUrl = stats.code ? `https://lightningsocial.io/ref/${stats.code}` : '';

  const handleCopy = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = referralUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    // Check ambassador terms first
    if (!termsAccepted) {
      setShowTerms(true);
      return;
    }
    doShare();
  };

  const doShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Lightning!',
          text: `Join Lightning — a faith community app! Use my referral code: ${stats.code}`,
          url: referralUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleAcceptTerms = async () => {
    await acceptAmbassadorTerms(userId);
    setTermsAccepted(true);
    setShowTerms(false);
    // After accepting, trigger the share directly (no recursion)
    doShare();
  };

  if (loading) {
    return (
      <div className="px-4 mt-3">
        <div
          className={`p-5 rounded-2xl animate-pulse ${nightMode ? 'bg-white/5' : 'bg-white/20'}`}
          style={{ height: 120 }}
        />
      </div>
    );
  }

  if (!stats.code) return null;

  const cardStyle = {
    background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.25)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: `1px solid ${nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.4)'}`,
    boxShadow: nightMode
      ? '0 4px 16px rgba(0,0,0,0.3)'
      : '0 4px 16px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,0.5)',
  };

  return (
    <div className="px-4 mt-3">
      <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className={`w-4 h-4 ${nightMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <span className={`text-sm font-bold ${nightMode ? 'text-white' : 'text-black'}`}>
              Ambassador
            </span>
          </div>
          {countdown && (
            <div className="flex items-center gap-1.5">
              <Clock className={`w-3 h-3 ${nightMode ? 'text-white/40' : 'text-black/40'}`} />
              <span className={`text-xs ${nightMode ? 'text-white/40' : 'text-black/40'}`}>
                Resets in {countdown}
              </span>
            </div>
          )}
        </div>

        {/* Referral Code */}
        <div className="flex items-center gap-3">
          <div
            className="flex-1 px-4 py-2.5 rounded-xl text-center"
            style={{
              background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <span
              className={`text-lg font-mono font-bold tracking-wider ${nightMode ? 'text-blue-400' : 'text-blue-600'}`}
            >
              {stats.code}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className={`p-2.5 rounded-xl transition-all active:scale-95 ${
              copied
                ? 'bg-green-500/20 text-green-500'
                : nightMode ? 'bg-white/6 hover:bg-white/10 text-white/60' : 'bg-black/4 hover:bg-black/8 text-black/60'
            }`}
            title="Copy link"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowQR(!showQR)}
            className={`p-2.5 rounded-xl transition-all active:scale-95 ${
              nightMode ? 'bg-white/6 hover:bg-white/10 text-white/60' : 'bg-black/4 hover:bg-black/8 text-black/60'
            }`}
            title="Show QR code"
          >
            <span className="text-sm">QR</span>
          </button>
        </div>

        {/* QR Code (expandable) */}
        {showQR && (
          <div className="flex justify-center py-3">
            <div className="p-3 bg-white rounded-xl">
              <QRCodeSVG
                value={referralUrl}
                size={160}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl"
            style={{
              background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            }}
          >
            <Users className={`w-3.5 h-3.5 ${nightMode ? 'text-white/50' : 'text-black/50'}`} />
            <span className={`text-xs ${nightMode ? 'text-white/60' : 'text-black/60'}`}>
              <strong>{stats.confirmed}</strong> confirmed
            </span>
            {stats.pending > 0 && (
              <span className={`text-xs ${nightMode ? 'text-white/40' : 'text-black/40'}`}>
                ({stats.pending} pending)
              </span>
            )}
          </div>
        </div>

        {/* Points */}
        <div className="flex gap-3">
          <div className="flex-1 text-center py-2.5 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(79, 150, 255, 0.12) 0%, rgba(59, 130, 246, 0.06) 100%)',
              border: '1px solid rgba(79, 150, 255, 0.15)',
            }}
          >
            <div className={`text-lg font-bold ${nightMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {points.bp}
            </div>
            <div className={`text-[10px] font-medium ${nightMode ? 'text-blue-400/60' : 'text-blue-600/60'}`}>
              Blessing Points
            </div>
          </div>
          <div className="flex-1 text-center py-2.5 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(139, 92, 246, 0.06) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.15)',
            }}
          >
            <div className={`text-lg font-bold ${nightMode ? 'text-purple-400' : 'text-purple-600'}`}>
              {points.op}
            </div>
            <div className={`text-[10px] font-medium ${nightMode ? 'text-purple-400/60' : 'text-purple-600/60'}`}>
              Overall Points
            </div>
          </div>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all active:scale-95 hover:scale-[1.02] flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
          }}
        >
          <Share2 className="w-4 h-4" />
          Share Invite Link
        </button>

        {copied && (
          <p className={`text-center text-xs ${nightMode ? 'text-green-400' : 'text-green-600'}`}>
            Link copied to clipboard!
          </p>
        )}
      </div>

      <AmbassadorTermsModal
        nightMode={nightMode}
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={handleAcceptTerms}
      />
    </div>
  );
};

export default MyReferralSection;
