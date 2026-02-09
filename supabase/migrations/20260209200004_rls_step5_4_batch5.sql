-- ============================================
-- LIGHTNING APP - STEP 5.4 BATCH 5: Tighten RLS Policies
-- Tables: servers, server_members, server_roles, server_role_permissions,
--         server_categories, server_channels, channel_role_access,
--         channel_messages, channel_message_reactions,
--         channel_read_receipts, channel_typing_indicators,
--         server_join_requests
-- ============================================
-- Pre-requisite: Batch 1 must be run first (creates get_user_id() function)
-- ============================================

-- ============================================
-- HELPER FUNCTION: is_server_member(server_uuid)
-- Returns true if the current user is a member of the given server
-- ============================================
CREATE OR REPLACE FUNCTION public.is_server_member(_server_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = _server_id
      AND user_id = (SELECT public.get_user_id())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_server_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_server_member(uuid) TO anon;

-- ============================================
-- HELPER FUNCTION: is_server_admin(server_uuid)
-- Returns true if the current user is creator or has admin/owner role
-- ============================================
CREATE OR REPLACE FUNCTION public.is_server_admin(_server_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.servers
    WHERE id = _server_id
      AND creator_id = (SELECT public.get_user_id())
  )
  OR EXISTS (
    SELECT 1 FROM public.server_members sm
    JOIN public.server_roles sr ON sr.id = sm.role_id
    WHERE sm.server_id = _server_id
      AND sm.user_id = (SELECT public.get_user_id())
      AND sr.name IN ('Owner', 'Admin', 'owner', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_server_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_server_admin(uuid) TO anon;

-- ============================================
-- HELPER FUNCTION: has_server_permission(server_uuid, permission_name)
-- Checks if the user's role has a specific permission
-- ============================================
CREATE OR REPLACE FUNCTION public.has_server_permission(_server_id uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Server creator always has all permissions
  SELECT EXISTS (
    SELECT 1 FROM public.servers
    WHERE id = _server_id
      AND creator_id = (SELECT public.get_user_id())
  )
  OR EXISTS (
    SELECT 1 FROM public.server_members sm
    JOIN public.server_role_permissions srp ON srp.role_id = sm.role_id
    WHERE sm.server_id = _server_id
      AND sm.user_id = (SELECT public.get_user_id())
      AND (
        CASE _perm
          WHEN 'send_messages' THEN srp.send_messages
          WHEN 'pin_messages' THEN srp.pin_messages
          WHEN 'delete_messages' THEN srp.delete_messages
          WHEN 'create_invite' THEN srp.create_invite
          WHEN 'kick_members' THEN srp.kick_members
          WHEN 'ban_members' THEN srp.ban_members
          WHEN 'manage_channels' THEN srp.manage_channels
          WHEN 'manage_members' THEN srp.manage_members
          WHEN 'manage_roles' THEN srp.manage_roles
          WHEN 'manage_server' THEN srp.manage_server
          ELSE false
        END
      ) = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_server_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_server_permission(uuid, text) TO anon;

-- ============================================
-- TABLE 1: servers
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.servers;

-- SELECT: public servers visible to all; private servers visible to members
CREATE POLICY servers_select
  ON public.servers FOR SELECT
  USING (
    is_private = false
    OR is_private IS NULL
    OR creator_id = (SELECT public.get_user_id())
    OR (SELECT public.is_server_member(id))
  );

-- INSERT: user creates server as themselves
CREATE POLICY servers_insert_own
  ON public.servers FOR INSERT
  WITH CHECK (creator_id = (SELECT public.get_user_id()));

-- UPDATE: only admin can update server settings
CREATE POLICY servers_update_admin
  ON public.servers FOR UPDATE
  USING ((SELECT public.is_server_admin(id)));

-- DELETE: only creator can delete the server
CREATE POLICY servers_delete_creator
  ON public.servers FOR DELETE
  USING (creator_id = (SELECT public.get_user_id()));

-- ============================================
-- TABLE 2: server_members
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.server_members;

-- SELECT: server members can see the member list
CREATE POLICY server_members_select
  ON public.server_members FOR SELECT
  USING ((SELECT public.is_server_member(server_id)));

-- INSERT: admin can add members, OR user can join (self as user_id)
CREATE POLICY server_members_insert
  ON public.server_members FOR INSERT
  WITH CHECK (
    user_id = (SELECT public.get_user_id())
    OR (SELECT public.is_server_admin(server_id))
  );

-- UPDATE: only admins can change member roles/properties
CREATE POLICY server_members_update_admin
  ON public.server_members FOR UPDATE
  USING ((SELECT public.is_server_admin(server_id)));

-- DELETE: admin can kick; user can leave (remove own)
CREATE POLICY server_members_delete
  ON public.server_members FOR DELETE
  USING (
    user_id = (SELECT public.get_user_id())
    OR (SELECT public.is_server_admin(server_id))
  );

-- ============================================
-- TABLE 3: server_roles
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.server_roles;

-- SELECT: members can see roles (needed for display)
CREATE POLICY server_roles_select_member
  ON public.server_roles FOR SELECT
  USING ((SELECT public.is_server_member(server_id)));

-- INSERT: only admins can create roles
CREATE POLICY server_roles_insert_admin
  ON public.server_roles FOR INSERT
  WITH CHECK ((SELECT public.is_server_admin(server_id)));

-- UPDATE: only admins can modify roles
CREATE POLICY server_roles_update_admin
  ON public.server_roles FOR UPDATE
  USING ((SELECT public.is_server_admin(server_id)));

-- DELETE: only admins can delete roles (except the default/owner role)
CREATE POLICY server_roles_delete_admin
  ON public.server_roles FOR DELETE
  USING ((SELECT public.is_server_admin(server_id)));

-- ============================================
-- TABLE 4: server_role_permissions
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.server_role_permissions;

-- SELECT: members can see permissions (needed for UI permission checks)
CREATE POLICY server_role_permissions_select
  ON public.server_role_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.server_roles sr
      WHERE sr.id = server_role_permissions.role_id
        AND (SELECT public.is_server_member(sr.server_id))
    )
  );

-- INSERT: only admins
CREATE POLICY server_role_permissions_insert_admin
  ON public.server_role_permissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.server_roles sr
      WHERE sr.id = server_role_permissions.role_id
        AND (SELECT public.is_server_admin(sr.server_id))
    )
  );

-- UPDATE: only admins
CREATE POLICY server_role_permissions_update_admin
  ON public.server_role_permissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.server_roles sr
      WHERE sr.id = server_role_permissions.role_id
        AND (SELECT public.is_server_admin(sr.server_id))
    )
  );

-- DELETE: only admins
CREATE POLICY server_role_permissions_delete_admin
  ON public.server_role_permissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.server_roles sr
      WHERE sr.id = server_role_permissions.role_id
        AND (SELECT public.is_server_admin(sr.server_id))
    )
  );

-- ============================================
-- TABLE 5: server_categories
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'server_categories'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.server_categories';

    EXECUTE 'CREATE POLICY server_categories_select_member
      ON public.server_categories FOR SELECT
      USING ((SELECT public.is_server_member(server_id)))';

    EXECUTE 'CREATE POLICY server_categories_insert_admin
      ON public.server_categories FOR INSERT
      WITH CHECK ((SELECT public.has_server_permission(server_id, ''manage_channels'')))';

    EXECUTE 'CREATE POLICY server_categories_update_admin
      ON public.server_categories FOR UPDATE
      USING ((SELECT public.has_server_permission(server_id, ''manage_channels'')))';

    EXECUTE 'CREATE POLICY server_categories_delete_admin
      ON public.server_categories FOR DELETE
      USING ((SELECT public.has_server_permission(server_id, ''manage_channels'')))';
  END IF;
END $$;

-- ============================================
-- TABLE 6: server_channels
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.server_channels;

-- SELECT: members can see channels (private channels handled at app level for now)
CREATE POLICY server_channels_select_member
  ON public.server_channels FOR SELECT
  USING ((SELECT public.is_server_member(server_id)));

-- INSERT: admin with manage_channels permission
CREATE POLICY server_channels_insert_admin
  ON public.server_channels FOR INSERT
  WITH CHECK ((SELECT public.has_server_permission(server_id, 'manage_channels')));

-- UPDATE: admin with manage_channels permission
CREATE POLICY server_channels_update_admin
  ON public.server_channels FOR UPDATE
  USING ((SELECT public.has_server_permission(server_id, 'manage_channels')));

-- DELETE: admin with manage_channels permission
CREATE POLICY server_channels_delete_admin
  ON public.server_channels FOR DELETE
  USING ((SELECT public.has_server_permission(server_id, 'manage_channels')));

-- ============================================
-- TABLE 7: channel_role_access
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'channel_role_access'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.channel_role_access';

    -- SELECT: server members can see access rules
    EXECUTE 'CREATE POLICY channel_role_access_select
      ON public.channel_role_access FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.server_channels sc
          WHERE sc.id = channel_role_access.channel_id
            AND (SELECT public.is_server_member(sc.server_id))
        )
      )';

    -- INSERT/UPDATE/DELETE: only admins
    EXECUTE 'CREATE POLICY channel_role_access_insert_admin
      ON public.channel_role_access FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.server_channels sc
          WHERE sc.id = channel_role_access.channel_id
            AND (SELECT public.is_server_admin(sc.server_id))
        )
      )';

    EXECUTE 'CREATE POLICY channel_role_access_update_admin
      ON public.channel_role_access FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.server_channels sc
          WHERE sc.id = channel_role_access.channel_id
            AND (SELECT public.is_server_admin(sc.server_id))
        )
      )';

    EXECUTE 'CREATE POLICY channel_role_access_delete_admin
      ON public.channel_role_access FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.server_channels sc
          WHERE sc.id = channel_role_access.channel_id
            AND (SELECT public.is_server_admin(sc.server_id))
        )
      )';
  END IF;
END $$;

-- ============================================
-- TABLE 8: channel_messages
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.channel_messages;

-- SELECT: server members with channel access
CREATE POLICY channel_messages_select_member
  ON public.channel_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.server_channels sc
      WHERE sc.id = channel_messages.channel_id
        AND (SELECT public.is_server_member(sc.server_id))
    )
  );

-- INSERT: members with send_messages permission
CREATE POLICY channel_messages_insert_member
  ON public.channel_messages FOR INSERT
  WITH CHECK (
    sender_id = (SELECT public.get_user_id())
    AND EXISTS (
      SELECT 1 FROM public.server_channels sc
      WHERE sc.id = channel_messages.channel_id
        AND (SELECT public.is_server_member(sc.server_id))
    )
  );

-- UPDATE: sender can edit; admin can pin
CREATE POLICY channel_messages_update
  ON public.channel_messages FOR UPDATE
  USING (
    sender_id = (SELECT public.get_user_id())
    OR EXISTS (
      SELECT 1 FROM public.server_channels sc
      WHERE sc.id = channel_messages.channel_id
        AND (SELECT public.is_server_admin(sc.server_id))
    )
  );

-- DELETE: sender can delete own; admin with delete_messages permission
CREATE POLICY channel_messages_delete
  ON public.channel_messages FOR DELETE
  USING (
    sender_id = (SELECT public.get_user_id())
    OR EXISTS (
      SELECT 1 FROM public.server_channels sc
      WHERE sc.id = channel_messages.channel_id
        AND (SELECT public.has_server_permission(sc.server_id, 'delete_messages'))
    )
  );

-- ============================================
-- TABLE 9: channel_message_reactions
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.channel_message_reactions;

-- SELECT: server members can see reactions
CREATE POLICY channel_message_reactions_select
  ON public.channel_message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_messages cm
      JOIN public.server_channels sc ON sc.id = cm.channel_id
      WHERE cm.id = channel_message_reactions.message_id
        AND (SELECT public.is_server_member(sc.server_id))
    )
  );

-- INSERT: server members can add reactions
CREATE POLICY channel_message_reactions_insert
  ON public.channel_message_reactions FOR INSERT
  WITH CHECK (
    user_id = (SELECT public.get_user_id())
    AND EXISTS (
      SELECT 1 FROM public.channel_messages cm
      JOIN public.server_channels sc ON sc.id = cm.channel_id
      WHERE cm.id = channel_message_reactions.message_id
        AND (SELECT public.is_server_member(sc.server_id))
    )
  );

-- DELETE: user can remove their own reactions
CREATE POLICY channel_message_reactions_delete_own
  ON public.channel_message_reactions FOR DELETE
  USING (user_id = (SELECT public.get_user_id()));

-- ============================================
-- TABLE 10: channel_read_receipts
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'channel_read_receipts'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.channel_read_receipts';

    -- SELECT: user can see their own read receipts
    EXECUTE 'CREATE POLICY channel_read_receipts_select_own
      ON public.channel_read_receipts FOR SELECT
      USING (user_id = (SELECT public.get_user_id()))';

    -- INSERT: user can create their own read receipts
    EXECUTE 'CREATE POLICY channel_read_receipts_insert_own
      ON public.channel_read_receipts FOR INSERT
      WITH CHECK (user_id = (SELECT public.get_user_id()))';

    -- UPDATE: user can update their own read receipts
    EXECUTE 'CREATE POLICY channel_read_receipts_update_own
      ON public.channel_read_receipts FOR UPDATE
      USING (user_id = (SELECT public.get_user_id()))';
  END IF;
END $$;

-- ============================================
-- TABLE 11: channel_typing_indicators
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'channel_typing_indicators'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.channel_typing_indicators';

    -- SELECT: server members can see typing indicators
    EXECUTE 'CREATE POLICY channel_typing_select
      ON public.channel_typing_indicators FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.server_channels sc
          WHERE sc.id = channel_typing_indicators.channel_id
            AND (SELECT public.is_server_member(sc.server_id))
        )
      )';

    -- INSERT: members can set typing (user_id = self)
    EXECUTE 'CREATE POLICY channel_typing_insert
      ON public.channel_typing_indicators FOR INSERT
      WITH CHECK (user_id = (SELECT public.get_user_id()))';

    -- UPDATE: members can update their own typing
    EXECUTE 'CREATE POLICY channel_typing_update
      ON public.channel_typing_indicators FOR UPDATE
      USING (user_id = (SELECT public.get_user_id()))';

    -- DELETE: members can clear their own typing
    EXECUTE 'CREATE POLICY channel_typing_delete
      ON public.channel_typing_indicators FOR DELETE
      USING (user_id = (SELECT public.get_user_id()))';
  END IF;
END $$;

-- ============================================
-- TABLE 12: server_join_requests
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'server_join_requests'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.server_join_requests';

    -- SELECT: requestor sees own; server admins see all for their server
    EXECUTE 'CREATE POLICY server_join_requests_select
      ON public.server_join_requests FOR SELECT
      USING (
        user_id = (SELECT public.get_user_id())
        OR (SELECT public.is_server_admin(server_id))
      )';

    -- INSERT: user can only submit requests as themselves
    EXECUTE 'CREATE POLICY server_join_requests_insert_own
      ON public.server_join_requests FOR INSERT
      WITH CHECK (user_id = (SELECT public.get_user_id()))';

    -- UPDATE: server admin can approve/deny
    EXECUTE 'CREATE POLICY server_join_requests_update_admin
      ON public.server_join_requests FOR UPDATE
      USING ((SELECT public.is_server_admin(server_id)))';

    -- DELETE: requestor can cancel their own request
    EXECUTE 'CREATE POLICY server_join_requests_delete_own
      ON public.server_join_requests FOR DELETE
      USING (user_id = (SELECT public.get_user_id()))';
  END IF;
END $$;
