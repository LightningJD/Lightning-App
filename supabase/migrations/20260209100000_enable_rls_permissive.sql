-- ============================================
-- LIGHTNING APP - PHASE 5 STEP 3: ENABLE RLS WITH PERMISSIVE POLICIES
-- ============================================
-- Purpose: Turn on RLS on ALL tables with wide-open permissive policies.
-- This is a safe intermediate step — behaviour is identical to RLS off,
-- but the "switch" is on so we can tighten policies table-by-table in Step 5.4.
--
-- Uses DO blocks to skip tables that don't exist yet in the live database.
-- ============================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    -- 1. USER TABLES
    'users', 'blocked_users', 'device_fingerprints',
    -- 2. SOCIAL TABLES
    'friendships', 'followers',
    -- 3. MESSAGING TABLES
    'messages', 'message_reactions', 'notifications',
    -- 4. GROUP TABLES
    'groups', 'group_members', 'group_messages', 'join_requests',
    'group_events', 'event_rsvps', 'event_messages', 'custom_roles',
    -- 5. SERVER TABLES
    'servers', 'server_members', 'server_roles', 'server_role_permissions',
    'server_categories', 'server_channels', 'channel_role_access',
    'channel_messages', 'channel_message_reactions', 'channel_read_receipts',
    'channel_typing_indicators', 'server_join_requests',
    -- 6. CONTENT TABLES (Testimonies)
    'testimonies', 'testimony_likes', 'testimony_views',
    'testimony_comments', 'testimony_generations',
    -- 7. CHURCH TABLES
    'churches',
    -- 8. REFERRAL & GAMIFICATION TABLES
    'referrals', 'leaderboard_cache', 'bp_cycles', 'bp_reset_dismissals',
    -- 9. BILLING & SUBSCRIPTION TABLES
    'subscriptions', 'subscription_events', 'pricing_tiers',
    'premium_cosmetics', 'individual_pro_cosmetics', 'member_count_snapshots',
    -- 10. MODERATION & SYSTEM TABLES
    'reports', 'announcements', 'announcement_receipts'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Only process tables that actually exist
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      -- Drop temp policy if it already exists (idempotent)
      EXECUTE format('DROP POLICY IF EXISTS "temp_permissive_all" ON %I', tbl);
      -- Create wide-open permissive policy
      EXECUTE format('CREATE POLICY "temp_permissive_all" ON %I USING (true) WITH CHECK (true)', tbl);
      RAISE NOTICE 'RLS enabled on: %', tbl;
    ELSE
      RAISE NOTICE 'SKIPPED (table does not exist): %', tbl;
    END IF;
  END LOOP;
END $$;

-- NOTE: spatial_ref_sys is a PostGIS system table — do NOT enable RLS on it.

-- ============================================
-- VERIFICATION QUERY (run after applying)
-- ============================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
