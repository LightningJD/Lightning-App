-- ============================================
-- Allow anonymous (unauthenticated) reads for publicly shared testimonies.
--
-- The initplan migration (20260417210000) rewrote testimonies_select to require
-- auth.role() = 'authenticated', which broke the /testimony/:id landing page
-- (QR code scan target) for users who are not logged in.
--
-- Fix: add a second permissive SELECT policy scoped to testimonies that are
-- explicitly marked for public sharing (is_public = true OR visibility in
-- ('all_churches', 'shareable')). Permissive policies are OR'd together, so
-- authenticated users keep the existing policy and anonymous users get this one.
-- ============================================

-- Testimonies: allow anon reads for public/shareable rows
CREATE POLICY testimonies_select_public
  ON public.testimonies
  FOR SELECT
  USING (
    is_public = true
    OR visibility = ANY (ARRAY['all_churches'::text, 'shareable'::text])
  );

-- Users: ensure anon can read basic profile info for testimony author display.
-- The original batch1 policy users_select_public (USING true) may still exist;
-- this is idempotent — CREATE IF NOT EXISTS pattern via DROP + CREATE.
DROP POLICY IF EXISTS testimonies_users_select_public ON public.users;
CREATE POLICY testimonies_users_select_public
  ON public.users
  FOR SELECT
  USING (profile_visibility = 'public' OR profile_visibility IS NULL);

-- Churches: allow anon to read church name for testimony author display.
DROP POLICY IF EXISTS testimonies_churches_select_public ON public.churches;
CREATE POLICY testimonies_churches_select_public
  ON public.churches
  FOR SELECT
  USING (true);
