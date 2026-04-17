-- PERF-1/2/3: Performance hardening pass from Supabase advisor.
--
-- PERF-1 (auth_rls_initplan, 8 policies): Supabase's query planner treats
-- bare `auth.uid()` / `auth.role()` / `auth.jwt()` as VOLATILE, so they
-- re-evaluate per row. Wrapping in `(SELECT auth.xxx())` turns it into an
-- initPlan that fires once per query.
--
-- PERF-2 (multiple_permissive_policies, 4): channel_notification_overrides
-- had two SELECT policies — "Users can view own notification overrides"
-- (SELECT-only) and "Users can manage own notification overrides" (FOR ALL).
-- Drop the redundant SELECT-only policy.
--
-- PERF-3 (duplicate_index, 1): message_reactions has two identical UNIQUE
-- constraints on (message_id, user_id, emoji):
--   - message_reactions_message_id_user_id_emoji_key (from repo migration
--     add_servers.sql line 139, `UNIQUE(...)` inline → auto-named)
--   - message_reactions_unique_per_user (added separately, likely via
--     dashboard; no repo reference)
-- No code paths reference either constraint name (verified via grep), so
-- either can be dropped. Keeping the _key variant since it's version-
-- controlled; dropping _unique_per_user.

BEGIN;

-- =============================================================
-- PERF-1: rewrite RLS policies to use initPlan for auth calls
-- =============================================================

-- public.users
DROP POLICY IF EXISTS users_select_authed ON public.users;
CREATE POLICY users_select_authed
  ON public.users
  FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- auth.jwt() wrapped as ((SELECT auth.jwt()) ->> 'sub') — writing the
-- subselect around auth.jwt() itself (rather than the whole ->> expression)
-- is what the advisor's pattern matcher expects.
DROP POLICY IF EXISTS users_insert_own ON public.users;
CREATE POLICY users_insert_own
  ON public.users
  FOR INSERT
  WITH CHECK (clerk_user_id = ((SELECT auth.jwt()) ->> 'sub'));

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own
  ON public.users
  FOR UPDATE
  USING (clerk_user_id = ((SELECT auth.jwt()) ->> 'sub'))
  WITH CHECK (clerk_user_id = ((SELECT auth.jwt()) ->> 'sub'));

-- public.churches
DROP POLICY IF EXISTS churches_select_authed ON public.churches;
CREATE POLICY churches_select_authed
  ON public.churches
  FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- public.testimonies — preserve visibility semantics, wrap auth.role()
-- (get_user_id() is a local SECURITY DEFINER function, not auth.*, fine)
DROP POLICY IF EXISTS testimonies_select ON public.testimonies;
CREATE POLICY testimonies_select
  ON public.testimonies
  FOR SELECT
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (
      user_id = public.get_user_id()
      OR is_public = true
      OR visibility = ANY (ARRAY['all_churches', 'shareable'])
    )
  );

-- public.server_audit_log (SELECT policy)
DROP POLICY IF EXISTS "Server members can view audit log" ON public.server_audit_log;
CREATE POLICY "Server members can view audit log"
  ON public.server_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members
      WHERE server_members.server_id = server_audit_log.server_id
        AND server_members.user_id = (SELECT auth.uid())
    )
  );

-- =============================================================
-- PERF-2: drop redundant SELECT policy + rewrite FOR ALL policy
-- =============================================================

DROP POLICY IF EXISTS "Users can view own notification overrides"
  ON public.channel_notification_overrides;

DROP POLICY IF EXISTS "Users can manage own notification overrides"
  ON public.channel_notification_overrides;
CREATE POLICY "Users can manage own notification overrides"
  ON public.channel_notification_overrides
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =============================================================
-- PERF-3: drop duplicate UNIQUE constraint on message_reactions
-- (dropping the constraint also drops its backing index)
-- =============================================================

ALTER TABLE public.message_reactions
  DROP CONSTRAINT IF EXISTS message_reactions_unique_per_user;

COMMIT;
