import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { getPricingTiers } from '../../lib/database/billing';
import type { PricingTier, BillingInterval } from '../../types/premium';

interface PricingTableProps {
  nightMode: boolean;
  currentMemberCount?: number;
  currentTier?: string | null;
  onSelectTier?: (tier: PricingTier, interval: BillingInterval) => void;
  isLoading?: boolean;
}

const PREMIUM_FEATURES = [
  'Custom server banner & branding',
  'Animated server icon with glow effects',
  'Verified church badge',
  'Custom accent colors',
  'Custom invite link (lightning.app/your-church)',
  'Branded testimony cards',
  'AI Congregation Insights',
  'Advanced analytics dashboard',
  'Communication automation',
  'Staff roles & permissions',
  'Content moderation queue',
  'Audit log',
  'API access & integrations',
];

const PricingTable: React.FC<PricingTableProps> = ({
  nightMode,
  currentMemberCount = 0,
  currentTier,
  onSelectTier,
  isLoading = false,
}) => {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTiers = async () => {
      const data = await getPricingTiers();
      setTiers(data);
      setLoading(false);
    };
    loadTiers();
  }, []);

  // Find the recommended tier based on member count
  const recommendedTier = tiers.find(t =>
    currentMemberCount >= t.min_members &&
    (t.max_members === null || t.max_members === undefined || currentMemberCount <= t.max_members)
  );

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className={`animate-spin w-6 h-6 border-2 border-t-transparent rounded-full mx-auto ${nightMode ? 'border-blue-400' : 'border-blue-500'}`} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Interval Toggle */}
      <div className="flex justify-center">
        <div
          className={`inline-flex rounded-xl p-1 ${nightMode ? 'bg-white/5' : 'bg-slate-100'}`}
        >
          <button
            onClick={() => setInterval('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              interval === 'monthly'
                ? nightMode
                  ? 'bg-blue-500/80 text-white shadow-md'
                  : 'bg-blue-500 text-white shadow-md'
                : nightMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval('annual')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              interval === 'annual'
                ? nightMode
                  ? 'bg-blue-500/80 text-white shadow-md'
                  : 'bg-blue-500 text-white shadow-md'
                : nightMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Annual
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              interval === 'annual'
                ? 'bg-white/20 text-white'
                : nightMode
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-green-100 text-green-700'
            }`}>
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Tier Cards */}
      <div className="space-y-2">
        {tiers.map((tier) => {
          const isRecommended = tier.tier === recommendedTier?.tier;
          const isCurrent = tier.tier === currentTier;
          const price = interval === 'annual' ? tier.annual_price_cents : tier.monthly_price_cents;
          const monthlyEquivalent = interval === 'annual' ? Math.round(tier.annual_price_cents / 12) : tier.monthly_price_cents;

          return (
            <button
              key={tier.id}
              onClick={() => onSelectTier?.(tier, interval)}
              disabled={isCurrent || isLoading}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                isRecommended
                  ? nightMode
                    ? 'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/15'
                    : 'border-blue-500/40 bg-blue-50 hover:bg-blue-100'
                  : isCurrent
                    ? nightMode
                      ? 'border-green-500/30 bg-green-500/5 cursor-default'
                      : 'border-green-500/30 bg-green-50 cursor-default'
                    : nightMode
                      ? 'border-white/10 bg-white/5 hover:bg-white/10'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {tier.display_name}
                    </span>
                    {isRecommended && !isCurrent && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
                        RECOMMENDED
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500 text-white">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {tier.min_members}{tier.max_members ? `–${tier.max_members}` : '+'} members
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {formatPrice(price)}
                  </span>
                  <span className={`text-xs ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    /{interval === 'annual' ? 'yr' : 'mo'}
                  </span>
                  {interval === 'annual' && (
                    <p className={`text-[10px] ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {formatPrice(monthlyEquivalent)}/mo
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Features List */}
      <div className={`p-4 rounded-xl border ${nightMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
        <h4 className={`text-sm font-semibold mb-3 ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
          All plans include:
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {PREMIUM_FEATURES.map((feature, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className={`w-3.5 h-3.5 flex-shrink-0 ${nightMode ? 'text-green-400' : 'text-green-500'}`} />
              <span className={`text-xs ${nightMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingTable;
