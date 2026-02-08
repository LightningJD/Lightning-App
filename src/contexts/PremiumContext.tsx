import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getServerSubscription, getUserSubscription, getServerCosmetics } from '../lib/database/billing';
import type {
  Subscription,
  PremiumCosmetics,
  ServerPremiumState,
  SubscriptionStatus,
  PremiumFeature,
  CHURCH_PREMIUM_FEATURES,
} from '../types/premium';
import { CHURCH_PREMIUM_FEATURES as ALL_CHURCH_FEATURES } from '../types/premium';

// ============================================
// CONTEXT TYPES
// ============================================

interface PremiumContextType {
  // Server premium
  getServerPremium: (serverId: string) => ServerPremiumState;
  refreshServerPremium: (serverId: string) => Promise<void>;
  loadServerPremium: (serverId: string) => Promise<void>;

  // Individual pro
  isUserPro: boolean;
  userProStatus: SubscriptionStatus;
  userProSubscription: Subscription | null;
  refreshUserPro: () => Promise<void>;

  // Feature checks
  hasFeature: (serverId: string | null, feature: PremiumFeature) => boolean;
  isServerPremium: (serverId: string) => boolean;

  // Loading
  isLoading: boolean;
}

const DEFAULT_SERVER_STATE: ServerPremiumState = {
  subscription: null,
  status: 'none',
  tier: null,
  trialEnd: null,
  currentPeriodEnd: null,
  features: [],
  cosmetics: null,
  isPremium: false,
  isPastDue: false,
  isCanceled: false,
};

// ============================================
// CONTEXT
// ============================================

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children, userId }) => {
  const [serverPremiumMap, setServerPremiumMap] = useState<Record<string, ServerPremiumState>>({});
  const [userProSubscription, setUserProSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ============================================
  // SERVER PREMIUM
  // ============================================

  const loadServerPremium = useCallback(async (serverId: string) => {
    try {
      const subscription = await getServerSubscription(serverId);

      if (!subscription) {
        setServerPremiumMap(prev => ({
          ...prev,
          [serverId]: { ...DEFAULT_SERVER_STATE },
        }));
        return;
      }

      const isPremium = ['trialing', 'active'].includes(subscription.status);
      const isPastDue = subscription.status === 'past_due';
      const isCanceled = subscription.status === 'canceled';

      // Load cosmetics if premium
      let cosmetics: PremiumCosmetics | null = null;
      if (isPremium || isPastDue) {
        cosmetics = await getServerCosmetics(serverId);
      }

      // Calculate days
      let daysUntilTrialEnd: number | undefined;
      if (subscription.trial_end) {
        const diff = new Date(subscription.trial_end).getTime() - Date.now();
        daysUntilTrialEnd = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }

      let daysUntilRenewal: number | undefined;
      if (subscription.current_period_end) {
        const diff = new Date(subscription.current_period_end).getTime() - Date.now();
        daysUntilRenewal = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }

      const state: ServerPremiumState = {
        subscription,
        status: subscription.status as SubscriptionStatus,
        tier: subscription.tier || null,
        trialEnd: subscription.trial_end || null,
        currentPeriodEnd: subscription.current_period_end || null,
        features: (isPremium || isPastDue) ? ALL_CHURCH_FEATURES : [],
        cosmetics,
        isPremium,
        isPastDue,
        isCanceled,
        daysUntilTrialEnd,
        daysUntilRenewal,
      };

      setServerPremiumMap(prev => ({
        ...prev,
        [serverId]: state,
      }));
    } catch (error) {
      console.error(`Error loading premium for server ${serverId}:`, error);
      setServerPremiumMap(prev => ({
        ...prev,
        [serverId]: { ...DEFAULT_SERVER_STATE },
      }));
    }
  }, []);

  const getServerPremium = useCallback((serverId: string): ServerPremiumState => {
    return serverPremiumMap[serverId] || DEFAULT_SERVER_STATE;
  }, [serverPremiumMap]);

  const refreshServerPremium = useCallback(async (serverId: string) => {
    await loadServerPremium(serverId);
  }, [loadServerPremium]);

  const isServerPremium = useCallback((serverId: string): boolean => {
    const state = serverPremiumMap[serverId];
    return state?.isPremium || false;
  }, [serverPremiumMap]);

  // ============================================
  // USER PRO
  // ============================================

  const loadUserPro = useCallback(async () => {
    if (!userId) return;

    try {
      const subscription = await getUserSubscription(userId);
      setUserProSubscription(subscription);
    } catch (error) {
      console.error('Error loading user pro subscription:', error);
      setUserProSubscription(null);
    }
  }, [userId]);

  const refreshUserPro = useCallback(async () => {
    await loadUserPro();
  }, [loadUserPro]);

  const isUserPro = userProSubscription
    ? ['trialing', 'active'].includes(userProSubscription.status)
    : false;

  const userProStatus: SubscriptionStatus = userProSubscription?.status as SubscriptionStatus || 'none';

  // ============================================
  // FEATURE CHECKS
  // ============================================

  const hasFeature = useCallback((serverId: string | null, feature: PremiumFeature): boolean => {
    if (serverId) {
      const state = serverPremiumMap[serverId];
      return state?.features.includes(feature) || false;
    }
    return false;
  }, [serverPremiumMap]);

  // ============================================
  // INITIAL LOAD
  // ============================================

  useEffect(() => {
    if (userId) {
      loadUserPro();
    }
  }, [userId, loadUserPro]);

  // Refresh on visibility change (user switches back to tab)
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && userId) {
        loadUserPro();
        // Refresh all loaded servers
        Object.keys(serverPremiumMap).forEach(serverId => {
          loadServerPremium(serverId);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [userId, loadUserPro, loadServerPremium, serverPremiumMap]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: PremiumContextType = {
    getServerPremium,
    refreshServerPremium,
    loadServerPremium,
    isUserPro,
    userProStatus,
    userProSubscription,
    refreshUserPro,
    hasFeature,
    isServerPremium,
    isLoading,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
};

// ============================================
// HOOKS
// ============================================

export const usePremium = (): PremiumContextType => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return context;
};

export const useServerPremium = (serverId: string | null) => {
  const { getServerPremium, hasFeature, loadServerPremium, refreshServerPremium } = usePremium();

  // Auto-load when serverId changes
  useEffect(() => {
    if (serverId) {
      loadServerPremium(serverId);
    }
  }, [serverId, loadServerPremium]);

  if (!serverId) {
    return {
      premium: DEFAULT_SERVER_STATE,
      isPremium: false,
      hasFeature: (_feature: PremiumFeature) => false,
      refresh: async () => {},
    };
  }

  return {
    premium: getServerPremium(serverId),
    isPremium: getServerPremium(serverId).isPremium,
    hasFeature: (feature: PremiumFeature) => hasFeature(serverId, feature),
    refresh: () => refreshServerPremium(serverId),
  };
};
