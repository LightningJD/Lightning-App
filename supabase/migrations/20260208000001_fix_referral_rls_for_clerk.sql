-- ============================================
-- FIX: Disable RLS on referral tables for Clerk auth
-- Since app uses Clerk (not Supabase Auth), auth.uid() is always NULL.
-- Security is enforced at the application level.
-- ============================================

-- Disable RLS on all new referral tables
ALTER TABLE referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE bp_cycles DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE device_fingerprints DISABLE ROW LEVEL SECURITY;
ALTER TABLE bp_reset_dismissals DISABLE ROW LEVEL SECURITY;

-- Drop all the policies that reference auth.uid() (they don't work with Clerk)
DROP POLICY IF EXISTS "Users can view own referrals as referrer" ON referrals;
DROP POLICY IF EXISTS "Users can view own referrals as referred" ON referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON referrals;
DROP POLICY IF EXISTS "Users can update own referral status" ON referrals;

DROP POLICY IF EXISTS "Anyone can read bp_cycles" ON bp_cycles;
DROP POLICY IF EXISTS "Anyone can insert bp_cycles" ON bp_cycles;
DROP POLICY IF EXISTS "Anyone can update bp_cycles" ON bp_cycles;

DROP POLICY IF EXISTS "Anyone can read leaderboard" ON leaderboard_cache;
DROP POLICY IF EXISTS "Anyone can manage leaderboard cache" ON leaderboard_cache;
DROP POLICY IF EXISTS "Anyone can update leaderboard cache" ON leaderboard_cache;
DROP POLICY IF EXISTS "Anyone can delete leaderboard cache" ON leaderboard_cache;

DROP POLICY IF EXISTS "Users can insert own fingerprint" ON device_fingerprints;
DROP POLICY IF EXISTS "Users can view own fingerprints" ON device_fingerprints;

DROP POLICY IF EXISTS "Users can manage own dismissals" ON bp_reset_dismissals;
