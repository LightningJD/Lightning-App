-- SEC-3: Fix tamper-evidence vulnerability in server_audit_log.
--
-- Prior state: the INSERT policy "Service role can insert audit log" was
-- LABELED for service_role but actually targeted the `public` role with
-- WITH CHECK (true). This let any anon or authenticated user INSERT audit
-- entries with arbitrary actor_id, server_id, and action_type — a forge
-- attack that could frame other users or pollute admin-visible logs.
--
-- Fix:
--   • actor_id must equal auth.uid()          → prevents forging identity
--   • caller must be a member or admin of the server_id
--                                            → prevents cross-server pollution
--
-- All existing client call sites pass the currently-authenticated user as
-- actor_id (verified in useServerState.ts and servers.ts), so no client
-- changes are required.

DROP POLICY IF EXISTS "Service role can insert audit log" ON public.server_audit_log;

CREATE POLICY server_audit_log_insert
  ON public.server_audit_log
  FOR INSERT
  WITH CHECK (
    actor_id = (SELECT public.get_user_id())
    AND (
      public.is_server_member(server_id)
      OR public.is_server_admin(server_id)
    )
  );
