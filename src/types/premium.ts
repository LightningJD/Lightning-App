// ============================================
// PREMIUM & BILLING TYPES
// ============================================

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'incomplete' | 'none';
export type SubscriptionType = 'church_premium' | 'individual_pro';
export type BillingInterval = 'monthly' | 'annual';

export type PremiumFeature =
  | 'custom_banner'
  | 'animated_icon'
  | 'verified_badge'
  | 'custom_accent'
  | 'custom_invite_link'
  | 'branded_testimonies'
  | 'ai_insights'
  | 'advanced_analytics'
  | 'communication_automation'
  | 'moderation_queue'
  | 'audit_log'
  | 'api_access'
  | 'webhook_integrations'
  | 'staff_roles';

// All church premium features (cosmetics + shepherd tools)
export const CHURCH_PREMIUM_FEATURES: PremiumFeature[] = [
  'custom_banner',
  'animated_icon',
  'verified_badge',
  'custom_accent',
  'custom_invite_link',
  'branded_testimonies',
  'ai_insights',
  'advanced_analytics',
  'communication_automation',
  'moderation_queue',
  'audit_log',
  'api_access',
  'webhook_integrations',
  'staff_roles',
];

// Individual pro features
export const INDIVIDUAL_PRO_FEATURES = [
  'profile_glow',
  'animated_avatar',
  'custom_testimony_design',
  'extended_ai_generation',
  'pro_badge',
  'custom_accent',
] as const;

export type IconAnimation = 'none' | 'glow' | 'pulse' | 'shimmer';
export type TestimonyCardTemplate = 'default' | 'classic' | 'modern' | 'minimal';

export interface Subscription {
  id: string;
  server_id?: string;
  user_id?: string;
  type: SubscriptionType;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  status: SubscriptionStatus;
  billing_interval: BillingInterval;
  current_period_start?: string;
  current_period_end?: string;
  current_price_cents?: number;
  trial_start?: string;
  trial_end?: string;
  trial_timezone?: string;
  tier?: string;
  tier_locked_until?: string;
  canceled_at?: string;
  cancel_reason?: string;
  grace_period_end?: string;
  data_retention_end?: string;
  created_at: string;
  updated_at: string;
}

export interface PremiumCosmetics {
  id?: string;
  server_id: string;
  banner_url?: string;
  banner_position?: string;
  icon_animation?: IconAnimation;
  icon_glow_color?: string;
  is_verified?: boolean;
  verified_at?: string;
  accent_primary?: string;
  accent_secondary?: string;
  custom_invite_slug?: string;
  testimony_card_template?: TestimonyCardTemplate;
  testimony_card_logo_url?: string;
}

export interface IndividualProCosmetics {
  id?: string;
  user_id: string;
  profile_badge?: string;
  accent_color?: string;
  profile_glow?: boolean;
  animated_avatar?: boolean;
  custom_testimony_design?: string;
}

export interface PricingTier {
  id: string;
  tier: string;
  display_name: string;
  min_members: number;
  max_members?: number;
  monthly_price_cents: number;
  annual_price_cents: number;
  stripe_monthly_price_id?: string;
  stripe_annual_price_id?: string;
  features: PremiumFeature[];
  is_active: boolean;
}

export interface ServerPremiumState {
  subscription: Subscription | null;
  status: SubscriptionStatus;
  tier: string | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  features: PremiumFeature[];
  cosmetics: PremiumCosmetics | null;
  isPremium: boolean; // trialing or active
  isPastDue: boolean;
  isCanceled: boolean;
  daysUntilTrialEnd?: number;
  daysUntilRenewal?: number;
}

export interface SubscriptionEvent {
  id: string;
  subscription_id: string;
  event_type: string;
  stripe_event_id?: string;
  previous_status?: string;
  new_status?: string;
  previous_tier?: string;
  new_tier?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface MemberCountSnapshot {
  id: string;
  server_id: string;
  member_count: number;
  current_tier?: string;
  next_tier?: string;
  snapshot_date: string;
  created_at: string;
}
