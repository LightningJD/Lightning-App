import { supabase } from '../supabase';
import type {
  Subscription,
  PremiumCosmetics,
  IndividualProCosmetics,
  PricingTier,
  MemberCountSnapshot,
  SubscriptionEvent,
} from '../../types/premium';

// ============================================
// SUBSCRIPTION QUERIES
// ============================================

/**
 * Get subscription for a server (church premium)
 */
export const getServerSubscription = async (serverId: string): Promise<Subscription | null> => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      // @ts-ignore - table not in generated types
      .select('*')
      .eq('server_id', serverId)
      .eq('type', 'church_premium')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows
      console.error('Error fetching server subscription:', error);
      return null;
    }

    return data as unknown as Subscription;
  } catch (error) {
    console.error('Error fetching server subscription:', error);
    return null;
  }
};

/**
 * Get subscription for an individual user (Lightning Pro)
 */
export const getUserSubscription = async (userId: string): Promise<Subscription | null> => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      // @ts-ignore
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'individual_pro')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching user subscription:', error);
      return null;
    }

    return data as unknown as Subscription;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
};

/**
 * Get all server subscriptions for servers a user is a member of
 */
export const getServerSubscriptionsForUser = async (serverIds: string[]): Promise<Subscription[]> => {
  if (!supabase || serverIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      // @ts-ignore
      .select('*')
      .in('server_id', serverIds)
      .eq('type', 'church_premium')
      .in('status', ['trialing', 'active', 'past_due', 'canceled']);

    if (error) {
      console.error('Error fetching server subscriptions:', error);
      return [];
    }

    return (data || []) as unknown as Subscription[];
  } catch (error) {
    console.error('Error fetching server subscriptions:', error);
    return [];
  }
};

// ============================================
// COSMETICS QUERIES
// ============================================

/**
 * Get cosmetics configuration for a premium server
 */
export const getServerCosmetics = async (serverId: string): Promise<PremiumCosmetics | null> => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('premium_cosmetics')
      // @ts-ignore
      .select('*')
      .eq('server_id', serverId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      return null;
    }

    return data as unknown as PremiumCosmetics;
  } catch {
    return null;
  }
};

/**
 * Create or update cosmetics for a server
 */
export const upsertServerCosmetics = async (
  serverId: string,
  cosmetics: Partial<PremiumCosmetics>
): Promise<PremiumCosmetics | null> => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('premium_cosmetics')
      // @ts-ignore
      .upsert({
        server_id: serverId,
        ...cosmetics,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'server_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting server cosmetics:', error);
      return null;
    }

    return data as unknown as PremiumCosmetics;
  } catch (error) {
    console.error('Error upserting server cosmetics:', error);
    return null;
  }
};

/**
 * Get individual Pro cosmetics for a user
 */
export const getUserProCosmetics = async (userId: string): Promise<IndividualProCosmetics | null> => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('individual_pro_cosmetics')
      // @ts-ignore
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      return null;
    }

    return data as unknown as IndividualProCosmetics;
  } catch {
    return null;
  }
};

/**
 * Create or update individual Pro cosmetics
 */
export const upsertUserProCosmetics = async (
  userId: string,
  cosmetics: Partial<IndividualProCosmetics>
): Promise<IndividualProCosmetics | null> => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('individual_pro_cosmetics')
      // @ts-ignore
      .upsert({
        user_id: userId,
        ...cosmetics,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting pro cosmetics:', error);
      return null;
    }

    return data as unknown as IndividualProCosmetics;
  } catch (error) {
    console.error('Error upserting pro cosmetics:', error);
    return null;
  }
};

// ============================================
// PRICING TIER QUERIES
// ============================================

/**
 * Get all active pricing tiers
 */
export const getPricingTiers = async (): Promise<PricingTier[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('pricing_tiers')
      // @ts-ignore
      .select('*')
      .eq('is_active', true)
      .order('min_members', { ascending: true });

    if (error) {
      console.error('Error fetching pricing tiers:', error);
      return [];
    }

    return (data || []) as unknown as PricingTier[];
  } catch (error) {
    console.error('Error fetching pricing tiers:', error);
    return [];
  }
};

/**
 * Get the appropriate pricing tier for a given member count
 */
export const getTierForMemberCount = async (memberCount: number): Promise<PricingTier | null> => {
  if (!supabase) return null;

  try {
    const tiers = await getPricingTiers();
    return tiers.find(t =>
      memberCount >= t.min_members &&
      (t.max_members === null || t.max_members === undefined || memberCount <= t.max_members)
    ) || null;
  } catch {
    return null;
  }
};

// ============================================
// MEMBER COUNT SNAPSHOTS
// ============================================

/**
 * Get member count snapshots for a server
 */
export const getMemberCountSnapshots = async (
  serverId: string,
  days: number = 30
): Promise<MemberCountSnapshot[]> => {
  if (!supabase) return [];

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('member_count_snapshots')
      // @ts-ignore
      .select('*')
      .eq('server_id', serverId)
      .gte('snapshot_date', startDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true });

    if (error) {
      console.error('Error fetching snapshots:', error);
      return [];
    }

    return (data || []) as unknown as MemberCountSnapshot[];
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return [];
  }
};

// ============================================
// SUBSCRIPTION EVENTS
// ============================================

/**
 * Get subscription events (audit log)
 */
export const getSubscriptionEvents = async (
  subscriptionId: string,
  limit: number = 50
): Promise<SubscriptionEvent[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('subscription_events')
      // @ts-ignore
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching subscription events:', error);
      return [];
    }

    return (data || []) as unknown as SubscriptionEvent[];
  } catch (error) {
    console.error('Error fetching subscription events:', error);
    return [];
  }
};

// ============================================
// CHECKOUT HELPERS
// ============================================

/**
 * Create a Stripe checkout session via Cloudflare Function
 */
export const createCheckoutSession = async (params: {
  serverId?: string;
  userId?: string;
  userEmail: string;
  type: 'church_premium' | 'individual_pro';
  tier?: string;
  interval: 'monthly' | 'annual';
  timezone?: string;
}): Promise<{ url: string } | { error: string }> => {
  try {
    const response = await fetch('/api/stripe-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Failed to create checkout session' };
    }

    return { url: data.url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { error: 'Network error — please try again' };
  }
};

/**
 * Open Stripe Customer Portal
 */
export const openBillingPortal = async (stripeCustomerId: string): Promise<{ url: string } | { error: string }> => {
  try {
    const response = await fetch('/api/stripe-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stripeCustomerId,
        returnUrl: window.location.href,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Failed to open billing portal' };
    }

    return { url: data.url };
  } catch (error) {
    console.error('Error opening billing portal:', error);
    return { error: 'Network error — please try again' };
  }
};
