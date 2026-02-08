-- ============================================
-- LIGHTNING PREMIUM & BILLING SYSTEM
-- Full schema migration — all tables created upfront
-- ============================================

-- ============================================
-- 1. SUBSCRIPTIONS (Primary billing record)
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Polymorphic owner: exactly one of these is non-null
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Subscription type
  type TEXT NOT NULL CHECK (type IN ('church_premium', 'individual_pro')),

  -- Stripe IDs
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'expired', 'incomplete')),

  -- Billing
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'annual')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  current_price_cents INT,

  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  trial_timezone TEXT DEFAULT 'America/New_York',

  -- Church Premium: size tier
  tier TEXT,
  tier_locked_until TIMESTAMPTZ,

  -- Cancellation
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  cancel_feedback TEXT,
  grace_period_end TIMESTAMPTZ,
  data_retention_end TIMESTAMPTZ,
  soft_delete_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT one_owner CHECK (
    (server_id IS NOT NULL AND user_id IS NULL) OR
    (server_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_server ON subscriptions(server_id) WHERE server_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- 2. SUBSCRIPTION EVENTS (Audit log)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  previous_status TEXT,
  new_status TEXT,
  previous_tier TEXT,
  new_tier TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_events_subscription ON subscription_events(subscription_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_events_stripe ON subscription_events(stripe_event_id) WHERE stripe_event_id IS NOT NULL;

-- ============================================
-- 3. PRICING TIERS (Seeded — 7 tiers)
-- ============================================
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  min_members INT NOT NULL,
  max_members INT,
  monthly_price_cents INT NOT NULL,
  annual_price_cents INT NOT NULL,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO pricing_tiers (tier, display_name, min_members, max_members, monthly_price_cents, annual_price_cents) VALUES
  ('tier_1', '0-75 Members',     0,    75,   999,   9999),
  ('tier_2', '76-150 Members',   76,   150,  1999,  19999),
  ('tier_3', '151-300 Members',  151,  300,  2999,  29999),
  ('tier_4', '301-500 Members',  301,  500,  4999,  49999),
  ('tier_5', '501-1000 Members', 501,  1000, 6999,  69999),
  ('tier_6', '1001-2500 Members',1001, 2500, 9999,  99999),
  ('tier_7', '2500+ Members',    2501, NULL, 14999, 149999)
ON CONFLICT (tier) DO NOTHING;

-- ============================================
-- 4. MEMBER COUNT SNAPSHOTS
-- ============================================
CREATE TABLE IF NOT EXISTS member_count_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  member_count INT NOT NULL,
  current_tier TEXT,
  next_tier TEXT,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(server_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_server_date ON member_count_snapshots(server_id, snapshot_date DESC);

-- ============================================
-- 5. PREMIUM COSMETICS (Server)
-- ============================================
CREATE TABLE IF NOT EXISTS premium_cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID UNIQUE NOT NULL REFERENCES servers(id) ON DELETE CASCADE,

  banner_url TEXT,
  banner_position TEXT DEFAULT 'center',

  icon_animation TEXT DEFAULT 'none' CHECK (icon_animation IN ('none', 'glow', 'pulse', 'shimmer')),
  icon_glow_color TEXT DEFAULT '#7C3AED',

  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,

  accent_primary TEXT DEFAULT '#7C3AED',
  accent_secondary TEXT,

  custom_invite_slug TEXT UNIQUE,

  testimony_card_template TEXT DEFAULT 'default' CHECK (testimony_card_template IN ('default', 'classic', 'modern', 'minimal')),
  testimony_card_logo_url TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cosmetics_slug ON premium_cosmetics(custom_invite_slug) WHERE custom_invite_slug IS NOT NULL;

-- ============================================
-- 6. INDIVIDUAL PRO COSMETICS
-- ============================================
CREATE TABLE IF NOT EXISTS individual_pro_cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  profile_badge TEXT DEFAULT 'pro',
  accent_color TEXT DEFAULT '#7C3AED',
  profile_glow BOOLEAN DEFAULT false,
  animated_avatar BOOLEAN DEFAULT false,
  custom_testimony_design TEXT DEFAULT 'default',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. WIN-BACK EMAILS
-- ============================================
CREATE TABLE IF NOT EXISTS winback_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('day_14', 'day_60')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  resubscribed BOOLEAN DEFAULT false,

  UNIQUE(subscription_id, email_type)
);

-- ============================================
-- 8. SHEPHERD API KEYS (Phase 7)
-- ============================================
CREATE TABLE IF NOT EXISTS shepherd_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes JSONB DEFAULT '["read"]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'read_only', 'revoked')),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_server ON shepherd_api_keys(server_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON shepherd_api_keys(key_hash);

-- ============================================
-- 9. SHEPHERD WEBHOOKS (Phase 7)
-- ============================================
CREATE TABLE IF NOT EXISTS shepherd_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  secret_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'failed')),
  failure_count INT DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 10. SHEPHERD AUDIT LOG (Phase 6)
-- ============================================
CREATE TABLE IF NOT EXISTS shepherd_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_server ON shepherd_audit_log(server_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON shepherd_audit_log(actor_id);

-- ============================================
-- 11. AUTOMATION WORKFLOWS (Phase 6)
-- ============================================
CREATE TABLE IF NOT EXISTS automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('member_joined', 'scheduled', 'event_rsvp', 'manual', 'member_inactive')),
  trigger_config JSONB DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_paused_by_system BOOLEAN DEFAULT false,
  paused_at TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INT DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflows_server ON automation_workflows(server_id);

-- ============================================
-- 12. AUTOMATION EXECUTIONS (Phase 6)
-- ============================================
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  trigger_data JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- 13. CONGREGATION INSIGHTS (Phase 5)
-- ============================================
CREATE TABLE IF NOT EXISTS congregation_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  data_snapshot JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insights_server ON congregation_insights(server_id, generated_at DESC);

-- ============================================
-- 14. MODERATION QUEUE (Phase 6)
-- ============================================
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('message', 'testimony', 'profile', 'image')),
  content_id TEXT NOT NULL,
  content_preview TEXT,
  flag_reason TEXT NOT NULL,
  flagged_by TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'removed', 'dismissed')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modqueue_server ON moderation_queue(server_id, status);

-- ============================================
-- 15. SPONSORED CHURCHES (Future)
-- ============================================
CREATE TABLE IF NOT EXISTS sponsored_churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  sponsor_type TEXT NOT NULL CHECK (sponsor_type IN ('denominational', 'organizational', 'individual')),
  sponsor_user_id UUID REFERENCES users(id),
  sponsor_name TEXT,
  sponsor_contact_email TEXT,
  subscription_id UUID REFERENCES subscriptions(id),
  sponsorship_start TIMESTAMPTZ,
  sponsorship_end TIMESTAMPTZ,
  tier_override TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 16. DENOMINATIONAL DEALS (Future)
-- ============================================
CREATE TABLE IF NOT EXISTS denominational_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  denomination_name TEXT NOT NULL,
  discount_percent INT NOT NULL DEFAULT 0,
  max_churches INT,
  contact_name TEXT,
  contact_email TEXT,
  stripe_coupon_id TEXT,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
