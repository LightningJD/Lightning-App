import React from 'react';
import { Clock, Crown } from 'lucide-react';

interface TrialBannerProps {
  nightMode: boolean;
  daysLeft: number;
  onManageBilling?: () => void;
}

const TrialBanner: React.FC<TrialBannerProps> = ({
  nightMode,
  daysLeft,
  onManageBilling,
}) => {
  const nm = nightMode;
  const isUrgent = daysLeft <= 3;

  return (
    <div
      className="px-4 py-2.5 flex items-center gap-2.5"
      style={{
        background: isUrgent
          ? nm ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)'
          : nm ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.06)',
        borderBottom: `1px solid ${
          isUrgent
            ? nm ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)'
            : nm ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)'
        }`,
      }}
    >
      <Clock className={`w-4 h-4 flex-shrink-0 ${
        isUrgent
          ? nm ? 'text-amber-400' : 'text-amber-500'
          : nm ? 'text-blue-400' : 'text-blue-500'
      }`} />

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${nm ? 'text-white/70' : 'text-black/70'}`}>
          {isUrgent
            ? `Trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — add payment to continue`
            : `${daysLeft} days left in your free trial`
          }
        </p>
      </div>

      {onManageBilling && isUrgent && (
        <button
          onClick={onManageBilling}
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:scale-105 active:scale-95 ${
            nm ? 'text-amber-300 bg-amber-500/15' : 'text-amber-700 bg-amber-500/10'
          }`}
        >
          Add card
        </button>
      )}
    </div>
  );
};

export default TrialBanner;
