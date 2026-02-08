import React, { useState } from 'react';
import { Zap, CreditCard, ExternalLink, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { usePremium } from '../../contexts/PremiumContext';
import { createCheckoutSession, openBillingPortal, getSubscriptionEvents } from '../../lib/database/billing';
import type { BillingInterval, SubscriptionEvent } from '../../types/premium';
import ProBadge from './ProBadge';
import { showError, showSuccess } from '../../lib/toast';

interface ProSettingsProps {
  nightMode: boolean;
  userEmail: string;
  userId: string;
}

const ProSettings: React.FC<ProSettingsProps> = ({
  nightMode,
  userEmail,
  userId,
}) => {
  const { isUserPro, userProStatus, userProSubscription, refreshUserPro } = usePremium();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('monthly');
  const [showHistory, setShowHistory] = useState(false);
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const nm = nightMode;

  const handleSubscribe = async () => {
    setIsCheckingOut(true);
    try {
      const result = await createCheckoutSession({
        userId,
        userEmail,
        type: 'individual_pro',
        interval: selectedInterval,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if ('url' in result) {
        window.location.href = result.url;
      } else {
        showError(result.error);
      }
    } catch {
      showError('Failed to start checkout. Please try again.');
    }
    setIsCheckingOut(false);
  };

  const handleOpenPortal = async () => {
    if (!userProSubscription?.stripe_customer_id) {
      showError('No billing information found');
      return;
    }

    const result = await openBillingPortal(userProSubscription.stripe_customer_id);
    if ('url' in result) {
      window.open(result.url, '_blank');
    } else {
      showError(result.error);
    }
  };

  const handleLoadHistory = async () => {
    if (!userProSubscription?.id) return;
    setShowHistory(!showHistory);
    if (!showHistory && events.length === 0) {
      setLoadingEvents(true);
      const data = await getSubscriptionEvents(userProSubscription.id);
      setEvents(data);
      setLoadingEvents(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // ============================================
  // ACTIVE PRO VIEW
  // ============================================

  if (isUserPro || userProStatus === 'past_due' || userProStatus === 'canceled') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className={`w-5 h-5 ${nm ? 'text-purple-400' : 'text-purple-500'}`} />
          <h3 className={`text-base font-semibold ${nm ? 'text-slate-100' : 'text-slate-900'}`}>
            Lightning Pro
          </h3>
          <ProBadge size="sm" />
        </div>

        {/* Past Due Warning */}
        {userProStatus === 'past_due' && (
          <div className={`p-3 rounded-xl border ${nm ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className={`text-sm font-medium ${nm ? 'text-yellow-300' : 'text-yellow-800'}`}>
                  Payment failed
                </p>
                <p className={`text-xs mt-0.5 ${nm ? 'text-yellow-400/70' : 'text-yellow-700'}`}>
                  Update your payment method to keep Pro.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription details */}
        <div className={`p-4 rounded-xl border ${nm ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className={`text-sm ${nm ? 'text-slate-400' : 'text-slate-500'}`}>Plan</span>
              <span className={`text-sm font-medium ${nm ? 'text-slate-100' : 'text-slate-900'}`}>
                Lightning Pro
              </span>
            </div>

            {userProSubscription?.current_price_cents && (
              <div className="flex justify-between items-center">
                <span className={`text-sm ${nm ? 'text-slate-400' : 'text-slate-500'}`}>Price</span>
                <span className={`text-sm font-medium ${nm ? 'text-slate-100' : 'text-slate-900'}`}>
                  {formatPrice(userProSubscription.current_price_cents)}/{userProSubscription.billing_interval === 'annual' ? 'yr' : 'mo'}
                </span>
              </div>
            )}

            {userProSubscription?.current_period_end && (
              <div className="flex justify-between items-center">
                <span className={`text-sm ${nm ? 'text-slate-400' : 'text-slate-500'}`}>
                  {userProStatus === 'canceled' ? 'Access until' : 'Next renewal'}
                </span>
                <span className={`text-sm font-medium ${nm ? 'text-slate-100' : 'text-slate-900'}`}>
                  {formatDate(userProSubscription.current_period_end)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleOpenPortal}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
              nm
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
            className={`w-full text-center text-xs py-2 ${nm ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
          >
            {showHistory ? 'Hide' : 'View'} billing history
          </button>
        </div>

        {/* Billing History */}
        {showHistory && (
          <div className={`p-3 rounded-xl border ${nm ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            {loadingEvents ? (
              <div className="text-center py-4">
                <div className={`animate-spin w-4 h-4 border-2 border-t-transparent rounded-full mx-auto ${nm ? 'border-purple-400' : 'border-purple-500'}`} />
              </div>
            ) : events.length === 0 ? (
              <p className={`text-xs text-center py-2 ${nm ? 'text-slate-500' : 'text-slate-400'}`}>
                No billing events yet
              </p>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 10).map((event) => (
                  <div key={event.id} className="flex justify-between items-center">
                    <div>
                      <p className={`text-xs font-medium ${nm ? 'text-slate-300' : 'text-slate-700'}`}>
                        {event.event_type.replace(/_/g, ' ')}
                      </p>
                      <p className={`text-[10px] ${nm ? 'text-slate-500' : 'text-slate-400'}`}>
                        {formatDate(event.created_at)}
                      </p>
                    </div>
                    {event.new_status && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        event.new_status === 'active' ? 'bg-green-500/10 text-green-400' :
                        event.new_status === 'trialing' ? 'bg-purple-500/10 text-purple-400' :
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
  // UPGRADE VIEW
  // ============================================

  const PRO_FEATURES = [
    { icon: '✨', label: 'Profile glow effect' },
    { icon: '🎭', label: 'Animated avatar' },
    { icon: '🎨', label: 'Custom testimony design' },
    { icon: '🤖', label: 'Extended AI generation' },
    { icon: '⚡', label: 'Pro badge on profile' },
    { icon: '🎨', label: 'Custom accent color' },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className={`w-6 h-6 ${nm ? 'text-purple-400' : 'text-purple-500'}`} />
          <h3 className={`text-lg font-bold ${nm ? 'text-slate-100' : 'text-slate-900'}`}>
            Lightning Pro
          </h3>
        </div>
        <p className={`text-sm ${nm ? 'text-slate-400' : 'text-slate-500'}`}>
          Stand out with personal premium features
        </p>
      </div>

      {/* Features list */}
      <div className={`p-4 rounded-xl border ${nm ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="space-y-2.5">
          {PRO_FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="text-sm">{f.icon}</span>
              <span className={`text-sm ${nm ? 'text-slate-200' : 'text-slate-700'}`}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-2">
        {/* Toggle */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            onClick={() => setSelectedInterval('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedInterval === 'monthly'
                ? 'text-white'
                : nm ? 'text-white/40' : 'text-black/40'
            }`}
            style={{
              background: selectedInterval === 'monthly'
                ? 'linear-gradient(135deg, #7C3AED, #A855F7)'
                : nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedInterval('annual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedInterval === 'annual'
                ? 'text-white'
                : nm ? 'text-white/40' : 'text-black/40'
            }`}
            style={{
              background: selectedInterval === 'annual'
                ? 'linear-gradient(135deg, #7C3AED, #A855F7)'
                : nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }}
          >
            Annual
            <span className="ml-1 text-[10px] opacity-75">Save 17%</span>
          </button>
        </div>

        {/* Price display */}
        <div className="text-center mb-3">
          <span className={`text-3xl font-bold ${nm ? 'text-white' : 'text-black'}`}>
            {selectedInterval === 'annual' ? '$49.99' : '$4.99'}
          </span>
          <span className={`text-sm ${nm ? 'text-white/40' : 'text-black/40'}`}>
            /{selectedInterval === 'annual' ? 'year' : 'month'}
          </span>
        </div>
      </div>

      {/* Trial callout */}
      <div className={`p-3 rounded-xl border text-center ${nm ? 'border-purple-500/30 bg-purple-500/10' : 'border-purple-200 bg-purple-50'}`}>
        <p className={`text-sm font-medium ${nm ? 'text-purple-300' : 'text-purple-700'}`}>
          Start with a 30-day free trial
        </p>
        <p className={`text-xs mt-0.5 ${nm ? 'text-purple-400/70' : 'text-purple-600'}`}>
          Cancel anytime. No charge during trial.
        </p>
      </div>

      {/* Subscribe button */}
      <button
        onClick={handleSubscribe}
        disabled={isCheckingOut}
        className="w-full py-3.5 rounded-xl text-white font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
          boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
        }}
      >
        <Zap className="w-4 h-4" />
        {isCheckingOut ? 'Setting up...' : 'Start Free Trial'}
      </button>
    </div>
  );
};

export default ProSettings;
