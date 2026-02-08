import React, { useState } from 'react';
import { Crown, CreditCard, ExternalLink, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useServerPremium, usePremium } from '../../contexts/PremiumContext';
import { createCheckoutSession, openBillingPortal, getSubscriptionEvents } from '../../lib/database/billing';
import type { PricingTier, BillingInterval, SubscriptionEvent } from '../../types/premium';
import PricingTable from './PricingTable';
import PremiumBadge from './PremiumBadge';
import TierProximityWarning from './TierProximityWarning';
import { showError, showSuccess } from '../../lib/toast';
import { getTierForMemberCount } from '../../lib/database/billing';

interface SubscriptionSettingsProps {
  nightMode: boolean;
  serverId: string;
  serverName: string;
  memberCount: number;
  userEmail: string;
  userId: string;
}

const SubscriptionSettings: React.FC<SubscriptionSettingsProps> = ({
  nightMode,
  serverId,
  serverName,
  memberCount,
  userEmail,
  userId,
}) => {
  const { premium, isPremium, refresh } = useServerPremium(serverId);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const handleSelectTier = async (tier: PricingTier, interval: BillingInterval) => {
    setIsCheckingOut(true);
    try {
      const result = await createCheckoutSession({
        serverId,
        userId,
        userEmail,
        type: 'church_premium',
        tier: tier.tier,
        interval,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if ('url' in result) {
        window.location.href = result.url;
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to start checkout. Please try again.');
    }
    setIsCheckingOut(false);
  };

  const handleOpenPortal = async () => {
    if (!premium.subscription?.stripe_customer_id) {
      showError('No billing information found');
      return;
    }

    const result = await openBillingPortal(premium.subscription.stripe_customer_id);
    if ('url' in result) {
      window.open(result.url, '_blank');
    } else {
      showError(result.error);
    }
  };

  const handleLoadHistory = async () => {
    if (!premium.subscription?.id) return;
    setShowHistory(!showHistory);
    if (!showHistory && events.length === 0) {
      setLoadingEvents(true);
      const data = await getSubscriptionEvents(premium.subscription.id);
      setEvents(data);
      setLoadingEvents(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Status badge
  const StatusBadge = () => {
    const status = premium.status;
    const config: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
      trialing: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Trial' },
      active: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Active' },
      past_due: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Past Due' },
      canceled: { icon: XCircle, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Canceled' },
      expired: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Expired' },
    };

    const c = config[status] || config.expired;
    const Icon = c?.icon || XCircle;

    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${c?.color || ''} ${c?.bg || ''}`}>
        <Icon className="w-3 h-3" />
        {c?.label || status}
      </span>
    );
  };

  // ============================================
  // ACTIVE SUBSCRIPTION VIEW
  // ============================================

  if (isPremium || premium.isPastDue || premium.isCanceled) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Crown className={`w-5 h-5 ${nightMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
          <h3 className={`text-base font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
            Church Premium
          </h3>
          <StatusBadge />
        </div>

        {/* Past Due Warning */}
        {premium.isPastDue && (
          <div className={`p-3 rounded-xl border ${nightMode ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className={`text-sm font-medium ${nightMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                  Payment failed
                </p>
                <p className={`text-xs mt-0.5 ${nightMode ? 'text-yellow-400/70' : 'text-yellow-700'}`}>
                  Update your payment method to keep Premium.
                  {premium.subscription?.grace_period_end && (
                    <> Grace period ends {formatDate(premium.subscription.grace_period_end)}.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Details */}
        <div className={`p-4 rounded-xl border ${nightMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className={`text-sm ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>Plan</span>
              <span className={`text-sm font-medium ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {premium.tier ? `${premium.tier.replace('tier_', 'Tier ')}` : 'Church Premium'}
              </span>
            </div>

            {premium.subscription?.current_price_cents && (
              <div className="flex justify-between items-center">
                <span className={`text-sm ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>Price</span>
                <span className={`text-sm font-medium ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {formatPrice(premium.subscription.current_price_cents)}/{premium.subscription.billing_interval === 'annual' ? 'yr' : 'mo'}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className={`text-sm ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>Members</span>
              <span className={`text-sm font-medium ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {memberCount}
              </span>
            </div>

            {premium.status === 'trialing' && premium.daysUntilTrialEnd !== undefined && (
              <div className="flex justify-between items-center">
                <span className={`text-sm ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>Trial ends</span>
                <span className={`text-sm font-medium ${nightMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {premium.daysUntilTrialEnd} days left
                </span>
              </div>
            )}

            {premium.currentPeriodEnd && premium.status !== 'trialing' && (
              <div className="flex justify-between items-center">
                <span className={`text-sm ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {premium.isCanceled ? 'Access until' : 'Next renewal'}
                </span>
                <span className={`text-sm font-medium ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {formatDate(premium.currentPeriodEnd)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tier Proximity Warning - shows when within 10 members of next tier */}
        {isPremium && premium.tier && premium.subscription?.billing_interval && (
          <TierProximityWarningWrapper
            nightMode={nightMode}
            memberCount={memberCount}
            currentTier={premium.tier}
            billingInterval={premium.subscription.billing_interval as 'monthly' | 'annual'}
          />
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleOpenPortal}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
              nightMode
                ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Manage Billing
            <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
          </button>

          <button
            onClick={handleLoadHistory}
            className={`w-full text-center text-xs py-2 ${nightMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
          >
            {showHistory ? 'Hide' : 'View'} billing history
          </button>
        </div>

        {/* Billing History */}
        {showHistory && (
          <div className={`p-3 rounded-xl border ${nightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            {loadingEvents ? (
              <div className="text-center py-4">
                <div className={`animate-spin w-4 h-4 border-2 border-t-transparent rounded-full mx-auto ${nightMode ? 'border-blue-400' : 'border-blue-500'}`} />
              </div>
            ) : events.length === 0 ? (
              <p className={`text-xs text-center py-2 ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                No billing events yet
              </p>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 10).map((event) => (
                  <div key={event.id} className="flex justify-between items-center">
                    <div>
                      <p className={`text-xs font-medium ${nightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {event.event_type.replace(/_/g, ' ')}
                      </p>
                      <p className={`text-[10px] ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {formatDate(event.created_at)}
                      </p>
                    </div>
                    {event.new_status && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        event.new_status === 'active' ? 'bg-green-500/10 text-green-400' :
                        event.new_status === 'trialing' ? 'bg-blue-500/10 text-blue-400' :
                        event.new_status === 'past_due' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {event.new_status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // UPGRADE VIEW (No subscription)
  // ============================================

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className={`w-6 h-6 ${nightMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
          <h3 className={`text-lg font-bold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
            Upgrade to Premium
          </h3>
        </div>
        <p className={`text-sm ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Make {serverName} stand out with custom branding and powerful tools
        </p>
      </div>

      {/* Trial callout */}
      <div
        className={`p-3 rounded-xl border text-center ${nightMode ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-200 bg-blue-50'}`}
      >
        <p className={`text-sm font-medium ${nightMode ? 'text-blue-300' : 'text-blue-700'}`}>
          Start with a 30-day free trial
        </p>
        <p className={`text-xs mt-0.5 ${nightMode ? 'text-blue-400/70' : 'text-blue-600'}`}>
          Full premium experience. Cancel anytime.
        </p>
      </div>

      <PricingTable
        nightMode={nightMode}
        currentMemberCount={memberCount}
        currentTier={null}
        onSelectTier={handleSelectTier}
        isLoading={isCheckingOut}
      />
    </div>
  );
};

// Wrapper to fetch tier data for proximity warning
const TierProximityWarningWrapper: React.FC<{
  nightMode: boolean;
  memberCount: number;
  currentTier: string;
  billingInterval: 'monthly' | 'annual';
}> = ({ nightMode, memberCount, currentTier, billingInterval }) => {
  const [nextTier, setNextTier] = React.useState<any>(null);

  React.useEffect(() => {
    getTierForMemberCount(memberCount + 10).then(tier => {
      if (tier && tier.tier !== currentTier) {
        setNextTier(tier);
      }
    }).catch(() => {});
  }, [memberCount, currentTier]);

  if (!nextTier) return null;

  return (
    <TierProximityWarning
      nightMode={nightMode}
      currentMembers={memberCount}
      currentTier={currentTier}
      nextTier={nextTier.tier}
      nextTierMinMembers={nextTier.min_members}
      nextTierPriceCents={billingInterval === 'annual' ? nextTier.annual_price_cents : nextTier.monthly_price_cents}
      billingInterval={billingInterval}
    />
  );
};

export default SubscriptionSettings;
