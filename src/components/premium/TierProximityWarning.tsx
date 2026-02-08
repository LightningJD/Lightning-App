import React from 'react';
import { TrendingUp, Info } from 'lucide-react';

interface TierProximityWarningProps {
  nightMode: boolean;
  currentMembers: number;
  currentTier: string;
  nextTier: string;
  nextTierMinMembers: number;
  nextTierPriceCents: number;
  billingInterval: 'monthly' | 'annual';
}

const TierProximityWarning: React.FC<TierProximityWarningProps> = ({
  nightMode,
  currentMembers,
  currentTier,
  nextTier,
  nextTierMinMembers,
  nextTierPriceCents,
  billingInterval,
}) => {
  const nm = nightMode;
  const membersAway = nextTierMinMembers - currentMembers;
  const nextTierPrice = `$${(nextTierPriceCents / 100).toFixed(2)}`;

  if (membersAway > 10) return null;

  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: nm ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)',
        border: `1px solid ${nm ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)'}`,
      }}
    >
      <div className="flex items-start gap-2">
        <TrendingUp className={`w-4 h-4 mt-0.5 flex-shrink-0 ${nm ? 'text-blue-400' : 'text-blue-500'}`} />
        <div>
          <p className={`text-xs font-semibold ${nm ? 'text-blue-300' : 'text-blue-700'}`}>
            Growing fast!
          </p>
          <p className={`text-[11px] mt-0.5 ${nm ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
            {membersAway === 0
              ? `You've reached ${nextTierMinMembers} members. Your plan will update to ${nextTier.replace('tier_', 'Tier ')} (${nextTierPrice}/${billingInterval === 'annual' ? 'yr' : 'mo'}) at your next renewal.`
              : `Only ${membersAway} member${membersAway !== 1 ? 's' : ''} away from ${nextTier.replace('tier_', 'Tier ')}. Your pricing will adjust to ${nextTierPrice}/${billingInterval === 'annual' ? 'yr' : 'mo'} at renewal.`
            }
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <Info className="w-3 h-3 text-blue-400/50" />
            <span className={`text-[10px] ${nm ? 'text-blue-400/40' : 'text-blue-600/40'}`}>
              Tier changes only apply at renewal — never mid-cycle
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TierProximityWarning;
