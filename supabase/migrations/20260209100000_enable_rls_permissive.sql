-- ============================================
-- LIGHTNING APP - PHASE 5 STEP 3: ENABLE RLS WITH PERMISSIVE POLICIES
-- ============================================
-- Purpose: Turn on RLS on ALL tables with wide-open permissive policies.
-- This is a safe intermediate step — behaviour is identical to RLS off,
-- but the "switch" is on so we can tighten policies table-by-table in Step 5.4.
--
-- IMPORTANT: Do NOT delete this migration after tightening. Tightening
-- migrations will DROP these temp policies and CREATE real ones.
-- ============================================

-- Helper: wrap in a transaction so it's all-or-nothing
BEGIN;

-- ============================================
-- 1. USER TABLES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON users;
CREATE POLICY "temp_permissive_all" ON users USING (true) WITH CHECK (true);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON blocked_users;
CREATE POLICY "temp_permissive_all" ON blocked_users USING (true) WITH CHECK (true);

ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON device_fingerprints;
CREATE POLICY "temp_permissive_all" ON device_fingerprints USING (true) WITH CHECK (true);

-- ============================================
-- 2. SOCIAL TABLES
-- ============================================

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON friendships;
CREATE POLICY "temp_permissive_all" ON friendships USING (true) WITH CHECK (true);

ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON followers;
CREATE POLICY "temp_permissive_all" ON followers USING (true) WITH CHECK (true);

-- ============================================
-- 3. MESSAGING TABLES
-- ============================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON messages;
CREATE POLICY "temp_permissive_all" ON messages USING (true) WITH CHECK (true);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON message_reactions;
CREATE POLICY "temp_permissive_all" ON message_reactions USING (true) WITH CHECK (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON notifications;
CREATE POLICY "temp_permissive_all" ON notifications USING (true) WITH CHECK (true);

-- ============================================
-- 4. GROUP TABLES
-- ============================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON groups;
CREATE POLICY "temp_permissive_all" ON groups USING (true) WITH CHECK (true);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON group_members;
CREATE POLICY "temp_permissive_all" ON group_members USING (true) WITH CHECK (true);

ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON group_messages;
CREATE POLICY "temp_permissive_all" ON group_messages USING (true) WITH CHECK (true);

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON join_requests;
CREATE POLICY "temp_permissive_all" ON join_requests USING (true) WITH CHECK (true);

ALTER TABLE group_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON group_events;
CREATE POLICY "temp_permissive_all" ON group_events USING (true) WITH CHECK (true);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON event_rsvps;
CREATE POLICY "temp_permissive_all" ON event_rsvps USING (true) WITH CHECK (true);

ALTER TABLE event_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON event_messages;
CREATE POLICY "temp_permissive_all" ON event_messages USING (true) WITH CHECK (true);

-- ============================================
-- 5. SERVER TABLES
-- ============================================

ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON servers;
CREATE POLICY "temp_permissive_all" ON servers USING (true) WITH CHECK (true);

ALTER TABLE server_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON server_members;
CREATE POLICY "temp_permissive_all" ON server_members USING (true) WITH CHECK (true);

ALTER TABLE server_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON server_roles;
CREATE POLICY "temp_permissive_all" ON server_roles USING (true) WITH CHECK (true);

ALTER TABLE server_role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON server_role_permissions;
CREATE POLICY "temp_permissive_all" ON server_role_permissions USING (true) WITH CHECK (true);

ALTER TABLE server_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON server_categories;
CREATE POLICY "temp_permissive_all" ON server_categories USING (true) WITH CHECK (true);

ALTER TABLE server_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON server_channels;
CREATE POLICY "temp_permissive_all" ON server_channels USING (true) WITH CHECK (true);

ALTER TABLE channel_role_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON channel_role_access;
CREATE POLICY "temp_permissive_all" ON channel_role_access USING (true) WITH CHECK (true);

ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON channel_messages;
CREATE POLICY "temp_permissive_all" ON channel_messages USING (true) WITH CHECK (true);

ALTER TABLE channel_message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON channel_message_reactions;
CREATE POLICY "temp_permissive_all" ON channel_message_reactions USING (true) WITH CHECK (true);

ALTER TABLE channel_read_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON channel_read_receipts;
CREATE POLICY "temp_permissive_all" ON channel_read_receipts USING (true) WITH CHECK (true);

ALTER TABLE channel_typing_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON channel_typing_indicators;
CREATE POLICY "temp_permissive_all" ON channel_typing_indicators USING (true) WITH CHECK (true);

ALTER TABLE server_join_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON server_join_requests;
CREATE POLICY "temp_permissive_all" ON server_join_requests USING (true) WITH CHECK (true);

-- ============================================
-- 6. CONTENT TABLES (Testimonies)
-- ============================================

ALTER TABLE testimonies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON testimonies;
CREATE POLICY "temp_permissive_all" ON testimonies USING (true) WITH CHECK (true);

ALTER TABLE testimony_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON testimony_likes;
CREATE POLICY "temp_permissive_all" ON testimony_likes USING (true) WITH CHECK (true);

ALTER TABLE testimony_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON testimony_views;
CREATE POLICY "temp_permissive_all" ON testimony_views USING (true) WITH CHECK (true);

ALTER TABLE testimony_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON testimony_comments;
CREATE POLICY "temp_permissive_all" ON testimony_comments USING (true) WITH CHECK (true);

ALTER TABLE testimony_generations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON testimony_generations;
CREATE POLICY "temp_permissive_all" ON testimony_generations USING (true) WITH CHECK (true);

-- ============================================
-- 7. CHURCH TABLES
-- ============================================

ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON churches;
CREATE POLICY "temp_permissive_all" ON churches USING (true) WITH CHECK (true);

-- ============================================
-- 8. REFERRAL & GAMIFICATION TABLES
-- ============================================

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON referrals;
CREATE POLICY "temp_permissive_all" ON referrals USING (true) WITH CHECK (true);

ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON leaderboard_cache;
CREATE POLICY "temp_permissive_all" ON leaderboard_cache USING (true) WITH CHECK (true);

ALTER TABLE bp_cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON bp_cycles;
CREATE POLICY "temp_permissive_all" ON bp_cycles USING (true) WITH CHECK (true);

ALTER TABLE bp_reset_dismissals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON bp_reset_dismissals;
CREATE POLICY "temp_permissive_all" ON bp_reset_dismissals USING (true) WITH CHECK (true);

-- ============================================
-- 9. BILLING & SUBSCRIPTION TABLES
-- ============================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON subscriptions;
CREATE POLICY "temp_permissive_all" ON subscriptions USING (true) WITH CHECK (true);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON subscription_events;
CREATE POLICY "temp_permissive_all" ON subscription_events USING (true) WITH CHECK (true);

ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON pricing_tiers;
CREATE POLICY "temp_permissive_all" ON pricing_tiers USING (true) WITH CHECK (true);

ALTER TABLE premium_cosmetics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON premium_cosmetics;
CREATE POLICY "temp_permissive_all" ON premium_cosmetics USING (true) WITH CHECK (true);

ALTER TABLE individual_pro_cosmetics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON individual_pro_cosmetics;
CREATE POLICY "temp_permissive_all" ON individual_pro_cosmetics USING (true) WITH CHECK (true);

ALTER TABLE member_count_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON member_count_snapshots;
CREATE POLICY "temp_permissive_all" ON member_count_snapshots USING (true) WITH CHECK (true);

-- ============================================
-- 10. MODERATION & SYSTEM TABLES
-- ============================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON reports;
CREATE POLICY "temp_permissive_all" ON reports USING (true) WITH CHECK (true);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON announcements;
CREATE POLICY "temp_permissive_all" ON announcements USING (true) WITH CHECK (true);

ALTER TABLE announcement_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_permissive_all" ON announcement_receipts;
CREATE POLICY "temp_permissive_all" ON announcement_receipts USING (true) WITH CHECK (true);

-- NOTE: spatial_ref_sys is a PostGIS system table — do NOT enable RLS on it.
-- Supabase restricts ALTER on system tables, and it only contains coordinate reference data.

COMMIT;

-- ============================================
-- VERIFICATION QUERY (run manually after applying)
-- ============================================
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- All public tables should show rowsecurity = true
-- (except spatial_ref_sys which is in the pg_catalog/public boundary)
