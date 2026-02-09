-- ============================================
-- LIGHTNING APP - STEP 5.4 BATCH 6: Tighten RLS Policies
-- Tables: churches, device_fingerprints, referrals, leaderboard_cache,
--         bp_cycles, bp_reset_dismissals, subscriptions, subscription_events,
--         pricing_tiers, premium_cosmetics, individual_pro_cosmetics,
--         member_count_snapshots, reports, announcements, announcement_receipts
-- ============================================
-- Pre-requisite: Batch 1 must be run first (creates get_user_id() function)
-- ============================================

-- ============================================
-- TABLE 1: churches
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'churches'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.churches';

    -- SELECT: anyone can browse churches
    EXECUTE 'CREATE POLICY churches_select_public
      ON public.churches FOR SELECT
      USING (true)';

    -- INSERT: authenticated users can add a church
    EXECUTE 'CREATE POLICY churches_insert_authed
      ON public.churches FOR INSERT
      WITH CHECK ((SELECT public.get_user_id()) IS NOT NULL)';

    -- UPDATE: only the creator can edit their church
    EXECUTE 'CREATE POLICY churches_update_creator
      ON public.churches FOR UPDATE
      USING (created_by = (SELECT public.get_user_id()))';

    -- DELETE: only the creator can delete their church
    EXECUTE 'CREATE POLICY churches_delete_creator
      ON public.churches FOR DELETE
      USING (created_by = (SELECT public.get_user_id()))';
  END IF;
END $$;

-- ============================================
-- TABLE 2: device_fingerprints
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'device_fingerprints'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.device_fingerprints';

    -- SELECT: user can only see their own fingerprints
    EXECUTE 'CREATE POLICY device_fingerprints_select_own
      ON public.device_fingerprints FOR SELECT
      USING (user_id = (SELECT public.get_user_id()))';

    -- INSERT: user can only create their own fingerprints
    EXECUTE 'CREATE POLICY device_fingerprints_insert_own
      ON public.device_fingerprints FOR INSERT
      WITH CHECK (user_id = (SELECT public.get_user_id()))';

    -- No UPDATE or DELETE — fingerprints are immutable
  END IF;
END $$;

-- ============================================
-- TABLE 3: referrals
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'referrals'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.referrals';

    -- SELECT: referrer or referred can see referral records
    EXECUTE 'CREATE POLICY referrals_select_participant
      ON public.referrals FOR SELECT
      USING (
        referrer_id = (SELECT public.get_user_id())
        OR referred_id = (SELECT public.get_user_id())
      )';

    -- No INSERT/UPDATE/DELETE via client — managed by service role
  END IF;
END $$;

-- ============================================
-- TABLE 4: leaderboard_cache
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'leaderboard_cache'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.leaderboard_cache';

    -- SELECT: anyone can see the leaderboard
    EXECUTE 'CREATE POLICY leaderboard_cache_select_public
      ON public.leaderboard_cache FOR SELECT
      USING (true)';

    -- No INSERT/UPDATE/DELETE via client — managed by service role
  END IF;
END $$;

-- ============================================
-- TABLE 5: bp_cycles
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bp_cycles'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.bp_cycles';

    -- SELECT: anyone can see BP cycle data
    EXECUTE 'CREATE POLICY bp_cycles_select_public
      ON public.bp_cycles FOR SELECT
      USING (true)';

    -- No INSERT/UPDATE/DELETE via client — managed by service role
  END IF;
END $$;

-- ============================================
-- TABLE 6: bp_reset_dismissals
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bp_reset_dismissals'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.bp_reset_dismissals';

    -- SELECT: user sees their own dismissals
    EXECUTE 'CREATE POLICY bp_reset_dismissals_select_own
      ON public.bp_reset_dismissals FOR SELECT
      USING (user_id = (SELECT public.get_user_id()))';

    -- INSERT: user can dismiss for themselves
    EXECUTE 'CREATE POLICY bp_reset_dismissals_insert_own
      ON public.bp_reset_dismissals FOR INSERT
      WITH CHECK (user_id = (SELECT public.get_user_id()))';

    -- No UPDATE or DELETE needed
  END IF;
END $$;

-- ============================================
-- TABLE 7: subscriptions
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.subscriptions';

    -- SELECT: user can only see their own subscriptions
    EXECUTE 'CREATE POLICY subscriptions_select_own
      ON public.subscriptions FOR SELECT
      USING (user_id = (SELECT public.get_user_id()))';

    -- No INSERT/UPDATE/DELETE via client — managed by Stripe webhook (service role)
  END IF;
END $$;

-- ============================================
-- TABLE 8: subscription_events
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscription_events'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.subscription_events';

    -- SELECT: service only (no client access needed)
    -- Keep a restrictive policy that denies all client reads
    EXECUTE 'CREATE POLICY subscription_events_select_none
      ON public.subscription_events FOR SELECT
      USING (false)';

    -- No INSERT/UPDATE/DELETE via client — managed by service role
  END IF;
END $$;

-- ============================================
-- TABLE 9: pricing_tiers
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pricing_tiers'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.pricing_tiers';

    -- SELECT: anyone can see pricing
    EXECUTE 'CREATE POLICY pricing_tiers_select_public
      ON public.pricing_tiers FOR SELECT
      USING (true)';

    -- No INSERT/UPDATE/DELETE via client — managed by service role
  END IF;
END $$;

-- ============================================
-- TABLE 10: premium_cosmetics
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'premium_cosmetics'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.premium_cosmetics';

    -- SELECT: anyone can see the cosmetics catalog
    EXECUTE 'CREATE POLICY premium_cosmetics_select_public
      ON public.premium_cosmetics FOR SELECT
      USING (true)';

    -- No INSERT/UPDATE/DELETE via client — managed by service role
  END IF;
END $$;

-- ============================================
-- TABLE 11: individual_pro_cosmetics
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'individual_pro_cosmetics'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.individual_pro_cosmetics';

    -- SELECT: user can only see their own cosmetics
    EXECUTE 'CREATE POLICY individual_pro_cosmetics_select_own
      ON public.individual_pro_cosmetics FOR SELECT
      USING (user_id = (SELECT public.get_user_id()))';

    -- No INSERT/UPDATE/DELETE via client — managed by service role
  END IF;
END $$;

-- ============================================
-- TABLE 12: member_count_snapshots
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'member_count_snapshots'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.member_count_snapshots';

    -- SELECT: service only (background analytics)
    EXECUTE 'CREATE POLICY member_count_snapshots_select_none
      ON public.member_count_snapshots FOR SELECT
      USING (false)';
  END IF;
END $$;

-- ============================================
-- TABLE 13: reports
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reports'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.reports';

    -- SELECT: service only (admin dashboard reads reports)
    -- Users don't need to see reports after filing
    EXECUTE 'CREATE POLICY reports_select_own
      ON public.reports FOR SELECT
      USING (reporter_id = (SELECT public.get_user_id()))';

    -- INSERT: authenticated users can file reports
    EXECUTE 'CREATE POLICY reports_insert_authed
      ON public.reports FOR INSERT
      WITH CHECK ((SELECT public.get_user_id()) IS NOT NULL)';

    -- No UPDATE/DELETE via client — managed by admin service role
  END IF;
END $$;

-- ============================================
-- TABLE 14: announcements
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'announcements'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.announcements';

    -- SELECT: authenticated users can see announcements
    EXECUTE 'CREATE POLICY announcements_select_authed
      ON public.announcements FOR SELECT
      USING ((SELECT public.get_user_id()) IS NOT NULL)';

    -- No INSERT/UPDATE/DELETE via client — admin service role
  END IF;
END $$;

-- ============================================
-- TABLE 15: announcement_receipts
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'announcement_receipts'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.announcement_receipts';

    -- SELECT: user sees own receipts
    EXECUTE 'CREATE POLICY announcement_receipts_select_own
      ON public.announcement_receipts FOR SELECT
      USING (user_id = (SELECT public.get_user_id()))';

    -- INSERT: user can mark announcements as seen
    EXECUTE 'CREATE POLICY announcement_receipts_insert_own
      ON public.announcement_receipts FOR INSERT
      WITH CHECK (user_id = (SELECT public.get_user_id()))';

    -- UPDATE: user can update their own receipt (mark read)
    EXECUTE 'CREATE POLICY announcement_receipts_update_own
      ON public.announcement_receipts FOR UPDATE
      USING (user_id = (SELECT public.get_user_id()))';

    -- No DELETE needed
  END IF;
END $$;

-- ============================================
-- TABLE 16: server_bans (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'server_bans'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.server_bans';

    -- SELECT: server admins can see bans; banned user can see their own ban
    EXECUTE 'CREATE POLICY server_bans_select
      ON public.server_bans FOR SELECT
      USING (
        user_id = (SELECT public.get_user_id())
        OR (SELECT public.is_server_admin(server_id))
      )';

    -- INSERT: only admins with ban permission
    EXECUTE 'CREATE POLICY server_bans_insert_admin
      ON public.server_bans FOR INSERT
      WITH CHECK ((SELECT public.has_server_permission(server_id, ''ban_members'')))';

    -- DELETE: only admins can unban
    EXECUTE 'CREATE POLICY server_bans_delete_admin
      ON public.server_bans FOR DELETE
      USING ((SELECT public.is_server_admin(server_id)))';
  END IF;
END $$;

-- ============================================
-- TABLE 17: server_invites (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'server_invites'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.server_invites';

    -- SELECT: anyone can view invites (needed to join via invite link)
    EXECUTE 'CREATE POLICY server_invites_select_public
      ON public.server_invites FOR SELECT
      USING (true)';

    -- INSERT: members with create_invite permission
    EXECUTE 'CREATE POLICY server_invites_insert
      ON public.server_invites FOR INSERT
      WITH CHECK ((SELECT public.has_server_permission(server_id, ''create_invite'')))';

    -- DELETE: creator of invite or server admin
    EXECUTE 'CREATE POLICY server_invites_delete
      ON public.server_invites FOR DELETE
      USING (
        created_by = (SELECT public.get_user_id())
        OR (SELECT public.is_server_admin(server_id))
      )';
  END IF;
END $$;
