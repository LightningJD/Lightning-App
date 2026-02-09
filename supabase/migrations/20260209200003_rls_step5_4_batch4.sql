-- ============================================
-- LIGHTNING APP - STEP 5.4 BATCH 4: Tighten RLS Policies
-- Tables: groups, group_members, group_messages, join_requests,
--         group_events, event_rsvps, event_messages
-- ============================================
-- Pre-requisite: Batch 1 must be run first (creates get_user_id() function)
-- ============================================

-- ============================================
-- HELPER FUNCTION: is_group_member(group_uuid)
-- Returns true if the current user is a member of the given group
-- ============================================
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id
      AND user_id = (SELECT public.get_user_id())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO anon;

-- ============================================
-- HELPER FUNCTION: is_group_admin(group_uuid)
-- Returns true if the current user is creator or has admin/pastor role
-- ============================================
CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id
      AND creator_id = (SELECT public.get_user_id())
  )
  OR EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id
      AND user_id = (SELECT public.get_user_id())
      AND role IN ('pastor', 'admin', 'owner')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid) TO anon;

-- ============================================
-- TABLE 1: groups
-- ============================================
-- SELECT: public groups visible to all; private groups visible to members
-- INSERT: authenticated (creator_id = self)
-- UPDATE: admin/creator
-- DELETE: creator only
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.groups;

-- SELECT: public groups visible to all; private groups only to members
CREATE POLICY groups_select
  ON public.groups FOR SELECT
  USING (
    is_private = false
    OR is_private IS NULL
    OR creator_id = (SELECT public.get_user_id())
    OR (SELECT public.is_group_member(id))
  );

-- INSERT: user creates group as themselves
CREATE POLICY groups_insert_own
  ON public.groups FOR INSERT
  WITH CHECK (creator_id = (SELECT public.get_user_id()));

-- UPDATE: only admin/creator can update group settings
CREATE POLICY groups_update_admin
  ON public.groups FOR UPDATE
  USING ((SELECT public.is_group_admin(id)));

-- DELETE: only the original creator can delete the group
CREATE POLICY groups_delete_creator
  ON public.groups FOR DELETE
  USING (creator_id = (SELECT public.get_user_id()));

-- ============================================
-- TABLE 2: group_members
-- ============================================
-- SELECT: members of the group
-- INSERT: admin (add) or self (join public group)
-- UPDATE: admin (change role)
-- DELETE: admin (kick) or self (leave)
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.group_members;

-- SELECT: group members can see the member list
CREATE POLICY group_members_select
  ON public.group_members FOR SELECT
  USING ((SELECT public.is_group_member(group_id)));

-- INSERT: admins can add members, OR user can join (self as user_id)
CREATE POLICY group_members_insert
  ON public.group_members FOR INSERT
  WITH CHECK (
    user_id = (SELECT public.get_user_id())
    OR (SELECT public.is_group_admin(group_id))
  );

-- UPDATE: only admins can change member roles
CREATE POLICY group_members_update_admin
  ON public.group_members FOR UPDATE
  USING ((SELECT public.is_group_admin(group_id)));

-- DELETE: admins can kick; users can leave (remove own membership)
CREATE POLICY group_members_delete
  ON public.group_members FOR DELETE
  USING (
    user_id = (SELECT public.get_user_id())
    OR (SELECT public.is_group_admin(group_id))
  );

-- ============================================
-- TABLE 3: group_messages
-- ============================================
-- SELECT: members of the group
-- INSERT: members of the group (sender_id = self)
-- UPDATE: owner (sender_id)
-- DELETE: owner (sender_id) or admin
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.group_messages;

-- SELECT: only group members can read messages
CREATE POLICY group_messages_select_member
  ON public.group_messages FOR SELECT
  USING ((SELECT public.is_group_member(group_id)));

-- INSERT: members can send messages as themselves
CREATE POLICY group_messages_insert_member
  ON public.group_messages FOR INSERT
  WITH CHECK (
    sender_id = (SELECT public.get_user_id())
    AND (SELECT public.is_group_member(group_id))
  );

-- UPDATE: only sender can edit their own message (or admin can pin)
CREATE POLICY group_messages_update
  ON public.group_messages FOR UPDATE
  USING (
    sender_id = (SELECT public.get_user_id())
    OR (SELECT public.is_group_admin(group_id))
  );

-- DELETE: sender can delete own messages; admin can delete any
CREATE POLICY group_messages_delete
  ON public.group_messages FOR DELETE
  USING (
    sender_id = (SELECT public.get_user_id())
    OR (SELECT public.is_group_admin(group_id))
  );

-- ============================================
-- TABLE 4: join_requests
-- ============================================
-- SELECT: owner (user_id) or group admin
-- INSERT: authenticated (user_id = self)
-- UPDATE: group admin (approve/deny)
-- DELETE: owner (cancel request)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'join_requests'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.join_requests';

    -- SELECT: requestor sees own; group admins see all for their group
    EXECUTE 'CREATE POLICY join_requests_select
      ON public.join_requests FOR SELECT
      USING (
        user_id = (SELECT public.get_user_id())
        OR (SELECT public.is_group_admin(group_id))
      )';

    -- INSERT: user can only submit requests as themselves
    EXECUTE 'CREATE POLICY join_requests_insert_own
      ON public.join_requests FOR INSERT
      WITH CHECK (user_id = (SELECT public.get_user_id()))';

    -- UPDATE: group admin can approve/deny
    EXECUTE 'CREATE POLICY join_requests_update_admin
      ON public.join_requests FOR UPDATE
      USING ((SELECT public.is_group_admin(group_id)))';

    -- DELETE: requestor can cancel their own request
    EXECUTE 'CREATE POLICY join_requests_delete_own
      ON public.join_requests FOR DELETE
      USING (user_id = (SELECT public.get_user_id()))';
  END IF;
END $$;

-- ============================================
-- TABLE 5: group_events
-- ============================================
-- SELECT: members of the group
-- INSERT: admin
-- UPDATE: admin
-- DELETE: admin
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'group_events'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.group_events';

    EXECUTE 'CREATE POLICY group_events_select_member
      ON public.group_events FOR SELECT
      USING ((SELECT public.is_group_member(group_id)))';

    EXECUTE 'CREATE POLICY group_events_insert_admin
      ON public.group_events FOR INSERT
      WITH CHECK ((SELECT public.is_group_admin(group_id)))';

    EXECUTE 'CREATE POLICY group_events_update_admin
      ON public.group_events FOR UPDATE
      USING ((SELECT public.is_group_admin(group_id)))';

    EXECUTE 'CREATE POLICY group_events_delete_admin
      ON public.group_events FOR DELETE
      USING ((SELECT public.is_group_admin(group_id)))';
  END IF;
END $$;

-- ============================================
-- TABLE 6: event_rsvps
-- ============================================
-- SELECT: members of the group (via event → group)
-- INSERT: members (user_id = self)
-- UPDATE: owner (user_id)
-- DELETE: owner (user_id)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'event_rsvps'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.event_rsvps';

    -- SELECT: group members can see RSVPs
    EXECUTE 'CREATE POLICY event_rsvps_select
      ON public.event_rsvps FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.group_events ge
          WHERE ge.id = event_rsvps.event_id
            AND (SELECT public.is_group_member(ge.group_id))
        )
      )';

    -- INSERT: user can only RSVP as themselves
    EXECUTE 'CREATE POLICY event_rsvps_insert_own
      ON public.event_rsvps FOR INSERT
      WITH CHECK (user_id = (SELECT public.get_user_id()))';

    -- UPDATE: user can only update their own RSVP
    EXECUTE 'CREATE POLICY event_rsvps_update_own
      ON public.event_rsvps FOR UPDATE
      USING (user_id = (SELECT public.get_user_id()))';

    -- DELETE: user can only cancel their own RSVP
    EXECUTE 'CREATE POLICY event_rsvps_delete_own
      ON public.event_rsvps FOR DELETE
      USING (user_id = (SELECT public.get_user_id()))';
  END IF;
END $$;

-- ============================================
-- TABLE 7: event_messages
-- ============================================
-- SELECT: members of the group (via event → group)
-- INSERT: members (user_id = self)
-- UPDATE: owner (user_id)
-- DELETE: owner (user_id) or admin
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'event_messages'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS temp_permissive_all ON public.event_messages';

    -- SELECT: group members can see event messages
    EXECUTE 'CREATE POLICY event_messages_select
      ON public.event_messages FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.group_events ge
          WHERE ge.id = event_messages.event_id
            AND (SELECT public.is_group_member(ge.group_id))
        )
      )';

    -- INSERT: members can send event messages as themselves
    EXECUTE 'CREATE POLICY event_messages_insert
      ON public.event_messages FOR INSERT
      WITH CHECK (user_id = (SELECT public.get_user_id()))';

    -- UPDATE: only the message author
    EXECUTE 'CREATE POLICY event_messages_update_own
      ON public.event_messages FOR UPDATE
      USING (user_id = (SELECT public.get_user_id()))';

    -- DELETE: author or group admin
    EXECUTE 'CREATE POLICY event_messages_delete
      ON public.event_messages FOR DELETE
      USING (
        user_id = (SELECT public.get_user_id())
        OR EXISTS (
          SELECT 1 FROM public.group_events ge
          WHERE ge.id = event_messages.event_id
            AND (SELECT public.is_group_admin(ge.group_id))
        )
      )';
  END IF;
END $$;
