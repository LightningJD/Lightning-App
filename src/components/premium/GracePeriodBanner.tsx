import React from 'react';
import { AlertTriangle, CreditCard } from 'lucide-react';

interface GracePeriodBannerProps {
  nightMode: boolean;
  daysLeft: number;
  onUpdatePayment: () => void;
}

const GracePeriodBanner: React.FC<GracePeriodBannerProps> = ({
  nightMode,
  daysLeft,
  onUpdatePayment,
}) => {
  const nm = nightMode;
  const isLastDay = daysLeft <= 1;

  return (
    <div
      className="px-4 py-3 flex items-start gap-3"
      style={{
        background: isLastDay
          ? nm ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)'
          : nm ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.06)',
        borderBottom: `1px solid ${
          isLastDay
            ? nm ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'
            : nm ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)'
        }`,
      }}
    >
      <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
        isLastDay
          ? nm ? 'text-red-400' : 'text-red-500'
          : nm ? 'text-yellow-400' : 'text-yellow-500'
      }`} />

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${nm ? 'text-white/80' : 'text-black/80'}`}>
          Payment failed
        </p>
        <p className={`text-[11px] mt-0.5 ${nm ? 'text-white/50' : 'text-black/50'}`}>
          {isLastDay
            ? 'Last day of grace period. Premium features will be disabled tomorrow.'
            : `Update your payment method within ${daysLeft} days to keep your premium features.`
          }
        </p>
      </div>

      <button
        onClick={onUpdatePayment}
        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 flex-shrink-0 text-white"
        style={{
          background: isLastDay
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #f59e0b, #d97706)',
          boxShadow: isLastDay
            ? '0 2px 6px rgba(239,68,68,0.3)'
            : '0 2px 6px rgba(245,158,11,0.3)',
        }}
      >
        <CreditCard className="w-3 h-3" />
        Fix
      </button>
    </div>
  );
};

export default GracePeriodBanner;
