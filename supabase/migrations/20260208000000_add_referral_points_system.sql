-- ============================================
-- REFERRAL & POINTS SYSTEM (Ambassador Program)
-- ============================================

-- 1. New columns on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blessing_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS overall_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ambassador_terms_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT false;

-- Index on referral_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- 2. Referrals table — tracks each referral relationship
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'confirmed', 'rejected'
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_id)  -- a user can only be referred once
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);

-- RLS for referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals as referrer"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid());

CREATE POLICY "Users can view own referrals as referred"
  ON referrals FOR SELECT
  USING (referred_id = auth.uid());

CREATE POLICY "Users can create referrals"
  ON referrals FOR INSERT
  WITH CHECK (referred_id = auth.uid());

CREATE POLICY "Users can update own referral status"
  ON referrals FOR UPDATE
  USING (referred_id = auth.uid());

-- 3. BP cycles table — biweekly blessing points reset cycles
CREATE TABLE IF NOT EXISTS bp_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_start TIMESTAMP WITH TIME ZONE NOT NULL,
  cycle_end TIMESTAMP WITH TIME ZONE NOT NULL,
  top_3 JSONB DEFAULT '[]'::jsonb,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bp_cycles_current ON bp_cycles(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_bp_cycles_end ON bp_cycles(cycle_end);

-- RLS for bp_cycles
ALTER TABLE bp_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bp_cycles"
  ON bp_cycles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert bp_cycles"
  ON bp_cycles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update bp_cycles"
  ON bp_cycles FOR UPDATE
  USING (true);

-- 4. Leaderboard cache — top 7 for both BP and OP
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,  -- 'bp' or 'op'
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  display_name TEXT,
  username TEXT,
  avatar_emoji TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_type_rank ON leaderboard_cache(type, rank);

-- RLS for leaderboard_cache
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard_cache FOR SELECT
  USING (true);

CREATE POLICY "Anyone can manage leaderboard cache"
  ON leaderboard_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update leaderboard cache"
  ON leaderboard_cache FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete leaderboard cache"
  ON leaderboard_cache FOR DELETE
  USING (true);

-- 5. Device fingerprints — for anti-gaming detection
CREATE TABLE IF NOT EXISTS device_fingerprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user ON device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_fp ON device_fingerprints(fingerprint);

-- RLS for device_fingerprints
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own fingerprint"
  ON device_fingerprints FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own fingerprints"
  ON device_fingerprints FOR SELECT
  USING (user_id = auth.uid());

-- 6. BP reset dismissals — tracks who dismissed the winner announcement
CREATE TABLE IF NOT EXISTS bp_reset_dismissals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES bp_cycles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, cycle_id)
);

CREATE INDEX IF NOT EXISTS idx_bp_reset_dismissals_user ON bp_reset_dismissals(user_id);

-- RLS for bp_reset_dismissals
ALTER TABLE bp_reset_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dismissals"
  ON bp_reset_dismissals FOR ALL
  USING (user_id = auth.uid());

-- 7. Initialize the first BP cycle (starts now, ends in 2 weeks)
INSERT INTO bp_cycles (cycle_start, cycle_end, is_current)
VALUES (NOW(), NOW() + INTERVAL '14 days', true)
ON CONFLICT DO NOTHING;
