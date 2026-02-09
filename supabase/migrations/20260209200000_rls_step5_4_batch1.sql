-- ============================================
-- LIGHTNING APP - STEP 5.4 BATCH 1: Tighten RLS Policies
-- Tables: users, blocked_users, friendships, followers
-- ============================================
-- Pre-requisite: Step 5.3 must be done (RLS enabled with temp_permissive_all)
-- Pre-requisite: Clerk-Supabase third-party auth integration must be configured
-- Pre-requisite: accessToken callback re-enabled in supabase.ts
--
-- auth.jwt()->>'sub' returns the Clerk user ID (e.g. 'user_2abc...')
-- get_user_id() maps that to the Supabase UUID in the users table
-- ============================================

-- ============================================
-- HELPER FUNCTION: get_user_id()
-- Maps Clerk user ID (from JWT 'sub' claim) to Supabase UUID
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users
  WHERE clerk_user_id = (SELECT auth.jwt()->>'sub')
  LIMIT 1;
$$;

-- Grant execute to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.get_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id() TO anon;

-- ============================================
-- TABLE 1: users
-- ============================================
-- SELECT: public (all profiles are browsable)
-- INSERT: authenticated (sync on signup — clerk_user_id must match JWT sub)
-- UPDATE: owner only (clerk_user_id = JWT sub)
-- DELETE: none (deactivate instead)
-- ============================================

-- Drop the temporary permissive policy
DROP POLICY IF EXISTS temp_permissive_all ON public.users;

-- SELECT: anyone can read user profiles (needed for discovery, friend lists, etc.)
CREATE POLICY users_select_public
  ON public.users FOR SELECT
  USING (true);

-- INSERT: authenticated users can insert their own row (clerk_user_id must match)
CREATE POLICY users_insert_own
  ON public.users FOR INSERT
  WITH CHECK (clerk_user_id = (SELECT auth.jwt()->>'sub'));

-- UPDATE: users can only update their own row
CREATE POLICY users_update_own
  ON public.users FOR UPDATE
  USING (clerk_user_id = (SELECT auth.jwt()->>'sub'))
  WITH CHECK (clerk_user_id = (SELECT auth.jwt()->>'sub'));

-- No DELETE policy — users cannot delete their own account via client

-- ============================================
-- TABLE 2: blocked_users
-- ============================================
-- SELECT: owner (blocker can see who they've blocked)
-- INSERT: owner (blocker_id must be self)
-- UPDATE: none
-- DELETE: owner (blocker can unblock)
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.blocked_users;

-- SELECT: the blocker can see their blocked list,
-- AND the blocked user can check if they are blocked (needed by isBlockedBy)
CREATE POLICY blocked_users_select_participant
  ON public.blocked_users FOR SELECT
  USING (
    blocker_id = (SELECT public.get_user_id())
    OR blocked_id = (SELECT public.get_user_id())
  );

-- INSERT: user can only block as themselves
CREATE POLICY blocked_users_insert_own
  ON public.blocked_users FOR INSERT
  WITH CHECK (blocker_id = (SELECT public.get_user_id()));

-- DELETE: user can only unblock people they blocked
CREATE POLICY blocked_users_delete_own
  ON public.blocked_users FOR DELETE
  USING (blocker_id = (SELECT public.get_user_id()));

-- No UPDATE policy — blocking has no mutable fields

-- ============================================
-- TABLE 3: friendships
-- ============================================
-- SELECT: participant (user_id_1 or user_id_2)
-- INSERT: authenticated (user_id_1 must be self, to send request)
-- UPDATE: participant (to accept/decline)
-- DELETE: participant (to unfriend)
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.friendships;

-- SELECT: either party can see the friendship
CREATE POLICY friendships_select_participant
  ON public.friendships FOR SELECT
  USING (
    user_id_1 = (SELECT public.get_user_id())
    OR user_id_2 = (SELECT public.get_user_id())
  );

-- INSERT: user can only create friendships where they are user_id_1
CREATE POLICY friendships_insert_own
  ON public.friendships FOR INSERT
  WITH CHECK (user_id_1 = (SELECT public.get_user_id()));

-- UPDATE: either party can update (accept/decline)
CREATE POLICY friendships_update_participant
  ON public.friendships FOR UPDATE
  USING (
    user_id_1 = (SELECT public.get_user_id())
    OR user_id_2 = (SELECT public.get_user_id())
  );

-- DELETE: either party can delete (unfriend)
CREATE POLICY friendships_delete_participant
  ON public.friendships FOR DELETE
  USING (
    user_id_1 = (SELECT public.get_user_id())
    OR user_id_2 = (SELECT public.get_user_id())
  );

-- ============================================
-- TABLE 4: followers
-- ============================================
-- SELECT: public (follower counts are visible)
-- INSERT: authenticated (follower_id must be self)
-- UPDATE: none
-- DELETE: owner (follower can unfollow)
-- ============================================

-- followers table may not exist on all environments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'followers'
  ) THEN
    -- Drop temp policy
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.followers';

    -- SELECT: anyone can see followers (public counts)
    EXECUTE 'CREATE POLICY followers_select_public
      ON public.followers FOR SELECT
      USING (true)';

    -- INSERT: user can only follow as themselves
    EXECUTE 'CREATE POLICY followers_insert_own
      ON public.followers FOR INSERT
      WITH CHECK (follower_id = (SELECT public.get_user_id()))';

    -- DELETE: user can only unfollow their own follows
    EXECUTE 'CREATE POLICY followers_delete_own
      ON public.followers FOR DELETE
      USING (follower_id = (SELECT public.get_user_id()))';

    -- No UPDATE policy — following has no mutable fields
  END IF;
END $$;
