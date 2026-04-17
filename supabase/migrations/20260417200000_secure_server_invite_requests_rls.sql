-- SEC-1: Enable RLS and tighten policies on server_invite_requests.
--
-- Prior state (surfaced by Supabase advisor):
--   • RLS DISABLED despite 4 policies being defined → policies inert,
--     anon+authenticated roles had full CRUD via table GRANTs.
--   • SELECT USING (true)             — fully public read
--   • INSERT WITH CHECK (auth'd)      — reasonable
--   • UPDATE USING (auth'd)           — any authed user could mutate ANY row
--   • DELETE USING (auth'd)           — any authed user could delete ANY row
--
-- New policy set (server admin = creator OR role Owner/Admin, via existing
-- public.is_server_admin helper):
--   • SELECT  — requester themselves, OR server admin
--   • INSERT  — authenticated user creating a row for themselves,
--               status must be 'pending' at creation
--   • UPDATE  — server admin only (approve/reject)
--   • DELETE  — requester (withdraw own request) OR server admin
--
-- Table was empty at migration time (0 rows) so no data migration needed.

BEGIN;

DROP POLICY IF EXISTS server_invite_requests_select ON public.server_invite_requests;
DROP POLICY IF EXISTS server_invite_requests_insert ON public.server_invite_requests;
DROP POLICY IF EXISTS server_invite_requests_update ON public.server_invite_requests;
DROP POLICY IF EXISTS server_invite_requests_delete ON public.server_invite_requests;

ALTER TABLE public.server_invite_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY server_invite_requests_select
  ON public.server_invite_requests
  FOR SELECT
  USING (
    user_id = (SELECT public.get_user_id())
    OR public.is_server_admin(server_id)
  );

CREATE POLICY server_invite_requests_insert
  ON public.server_invite_requests
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT public.get_user_id())
    AND status = 'pending'
  );

CREATE POLICY server_invite_requests_update
  ON public.server_invite_requests
  FOR UPDATE
  USING (public.is_server_admin(server_id))
  WITH CHECK (public.is_server_admin(server_id));

CREATE POLICY server_invite_requests_delete
  ON public.server_invite_requests
  FOR DELETE
  USING (
    user_id = (SELECT public.get_user_id())
    OR public.is_server_admin(server_id)
  );

COMMIT;
