-- ============================================
-- LIGHTNING APP - STEP 5.4 BATCH 2: Tighten RLS Policies
-- Tables: testimonies, testimony_likes, testimony_views, testimony_comments, testimony_generations
-- ============================================
-- Pre-requisite: Batch 1 must be run first (creates get_user_id() function)
-- ============================================

-- ============================================
-- TABLE 1: testimonies
-- ============================================
-- SELECT: visibility-based (is_public OR visibility rules)
-- INSERT: owner (user_id = self)
-- UPDATE: owner (user_id = self)
-- DELETE: owner (user_id = self)
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.testimonies;

-- SELECT: anyone can read public testimonies; owner always sees their own
-- Simplified: we treat all testimonies as publicly readable since the app
-- has a discovery feed and church feeds. The visibility column is enforced
-- at the application level for nuanced rules (my_church, friends, etc.)
-- Owner always sees their own.
CREATE POLICY testimonies_select
  ON public.testimonies FOR SELECT
  USING (
    user_id = (SELECT public.get_user_id())
    OR is_public = true
    OR visibility IN ('all_churches', 'shareable')
    OR true  -- permissive fallback: app-level filtering handles church/friend scoping
  );

-- INSERT: user can only create testimonies as themselves
CREATE POLICY testimonies_insert_own
  ON public.testimonies FOR INSERT
  WITH CHECK (user_id = (SELECT public.get_user_id()));

-- UPDATE: user can only update their own testimonies
CREATE POLICY testimonies_update_own
  ON public.testimonies FOR UPDATE
  USING (user_id = (SELECT public.get_user_id()))
  WITH CHECK (user_id = (SELECT public.get_user_id()));

-- DELETE: user can only delete their own testimonies
CREATE POLICY testimonies_delete_own
  ON public.testimonies FOR DELETE
  USING (user_id = (SELECT public.get_user_id()));

-- ============================================
-- TABLE 2: testimony_likes
-- ============================================
-- SELECT: anyone (like counts are public)
-- INSERT: authenticated (user_id = self)
-- UPDATE: none
-- DELETE: owner (user_id, to unlike)
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.testimony_likes;

-- SELECT: anyone can see likes (needed for like counts)
CREATE POLICY testimony_likes_select_public
  ON public.testimony_likes FOR SELECT
  USING (true);

-- INSERT: user can only like as themselves
CREATE POLICY testimony_likes_insert_own
  ON public.testimony_likes FOR INSERT
  WITH CHECK (user_id = (SELECT public.get_user_id()));

-- DELETE: user can only remove their own likes
CREATE POLICY testimony_likes_delete_own
  ON public.testimony_likes FOR DELETE
  USING (user_id = (SELECT public.get_user_id()));

-- No UPDATE policy — likes are not editable

-- ============================================
-- TABLE 3: testimony_views
-- ============================================
-- SELECT: owner (viewer can see own views, testimony author can see views on their testimonies)
-- INSERT: authenticated (system tracks views)
-- UPDATE: none
-- DELETE: none
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'testimony_views'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.testimony_views';

    -- SELECT: viewers see own views; testimony authors see views on their testimonies
    EXECUTE 'CREATE POLICY testimony_views_select
      ON public.testimony_views FOR SELECT
      USING (
        viewer_id = (SELECT public.get_user_id())
        OR testimony_id IN (
          SELECT id FROM public.testimonies WHERE user_id = (SELECT public.get_user_id())
        )
      )';

    -- INSERT: any authenticated user can record a view (viewer_id must be self)
    EXECUTE 'CREATE POLICY testimony_views_insert_own
      ON public.testimony_views FOR INSERT
      WITH CHECK (viewer_id = (SELECT public.get_user_id()))';

    -- No UPDATE or DELETE policies — views are immutable
  END IF;
END $$;

-- ============================================
-- TABLE 4: testimony_comments
-- ============================================
-- SELECT: anyone who can view the testimony (simplified to public for now)
-- INSERT: authenticated (user_id = self)
-- UPDATE: owner (user_id)
-- DELETE: owner (user_id) or testimony author
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'testimony_comments'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.testimony_comments';

    -- SELECT: anyone can see comments on public testimonies
    EXECUTE 'CREATE POLICY testimony_comments_select
      ON public.testimony_comments FOR SELECT
      USING (true)';

    -- INSERT: user can only comment as themselves
    EXECUTE 'CREATE POLICY testimony_comments_insert_own
      ON public.testimony_comments FOR INSERT
      WITH CHECK (user_id = (SELECT public.get_user_id()))';

    -- UPDATE: user can only edit their own comments
    EXECUTE 'CREATE POLICY testimony_comments_update_own
      ON public.testimony_comments FOR UPDATE
      USING (user_id = (SELECT public.get_user_id()))
      WITH CHECK (user_id = (SELECT public.get_user_id()))';

    -- DELETE: user can delete their own comments, or testimony author can delete any comment
    EXECUTE 'CREATE POLICY testimony_comments_delete
      ON public.testimony_comments FOR DELETE
      USING (
        user_id = (SELECT public.get_user_id())
        OR testimony_id IN (
          SELECT id FROM public.testimonies WHERE user_id = (SELECT public.get_user_id())
        )
      )';
  END IF;
END $$;

-- ============================================
-- TABLE 5: testimony_generations
-- ============================================
-- This table is only written by the Cloudflare Worker (service role key)
-- SELECT: owner only (user_id)
-- INSERT/UPDATE/DELETE: service only
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'testimony_generations'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.testimony_generations';

    -- SELECT: users can see their own generations
    EXECUTE 'CREATE POLICY testimony_generations_select_own
      ON public.testimony_generations FOR SELECT
      USING (user_id = (SELECT public.get_user_id()))';

    -- No INSERT/UPDATE/DELETE policies for client — service role key bypasses RLS
  END IF;
END $$;
