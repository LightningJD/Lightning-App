-- ============================================
-- LIGHTNING APP - STEP 5.4 BATCH 3: Tighten RLS Policies
-- Tables: messages, message_reactions, notifications
-- ============================================
-- Pre-requisite: Batch 1 must be run first (creates get_user_id() function)
-- ============================================

-- ============================================
-- TABLE 1: messages (DMs)
-- ============================================
-- SELECT: participant (sender or recipient)
-- INSERT: authenticated (sender_id = self)
-- UPDATE: owner (sender_id, for edits) OR recipient (mark as read)
-- DELETE: owner (sender_id)
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.messages;

-- SELECT: only sender or recipient can read the message
CREATE POLICY messages_select_participant
  ON public.messages FOR SELECT
  USING (
    sender_id = (SELECT public.get_user_id())
    OR recipient_id = (SELECT public.get_user_id())
  );

-- INSERT: user can only send messages as themselves
CREATE POLICY messages_insert_own
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = (SELECT public.get_user_id()));

-- UPDATE: sender can edit content; recipient can mark as read
-- Both participants can update (simplified — app logic enforces what fields change)
CREATE POLICY messages_update_participant
  ON public.messages FOR UPDATE
  USING (
    sender_id = (SELECT public.get_user_id())
    OR recipient_id = (SELECT public.get_user_id())
  );

-- DELETE: only sender can delete their messages
CREATE POLICY messages_delete_own
  ON public.messages FOR DELETE
  USING (sender_id = (SELECT public.get_user_id()));

-- ============================================
-- TABLE 2: message_reactions
-- ============================================
-- SELECT: participant of parent message
-- INSERT: participant of parent message
-- UPDATE: none
-- DELETE: owner (user_id)
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.message_reactions;

-- SELECT: users can see reactions on messages they participate in
-- Note: message_id is nullable, so we also allow viewing orphaned reactions
CREATE POLICY message_reactions_select
  ON public.message_reactions FOR SELECT
  USING (
    message_id IS NULL
    OR message_id IN (
      SELECT id FROM public.messages
      WHERE sender_id = (SELECT public.get_user_id())
         OR recipient_id = (SELECT public.get_user_id())
    )
  );

-- INSERT: user can add reactions to messages they participate in
CREATE POLICY message_reactions_insert
  ON public.message_reactions FOR INSERT
  WITH CHECK (
    user_id = (SELECT public.get_user_id())
    AND (
      message_id IS NULL
      OR message_id IN (
        SELECT id FROM public.messages
        WHERE sender_id = (SELECT public.get_user_id())
           OR recipient_id = (SELECT public.get_user_id())
      )
    )
  );

-- DELETE: user can only remove their own reactions
CREATE POLICY message_reactions_delete_own
  ON public.message_reactions FOR DELETE
  USING (user_id = (SELECT public.get_user_id()));

-- No UPDATE policy — reactions are not editable

-- ============================================
-- TABLE 3: notifications
-- ============================================
-- SELECT: owner (user_id)
-- INSERT: service only (or self for system-generated)
-- UPDATE: owner (mark read)
-- DELETE: owner
-- ============================================

DROP POLICY IF EXISTS temp_permissive_all ON public.notifications;

-- SELECT: users can only see their own notifications
CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT
  USING (user_id = (SELECT public.get_user_id()));

-- INSERT: allow authenticated users to create notifications
-- (Needed for client-side notification creation when sending friend requests, etc.)
-- Service role key bypasses RLS for server-generated notifications
CREATE POLICY notifications_insert
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- UPDATE: users can only update their own notifications (mark as read)
CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE
  USING (user_id = (SELECT public.get_user_id()));

-- DELETE: users can only delete their own notifications
CREATE POLICY notifications_delete_own
  ON public.notifications FOR DELETE
  USING (user_id = (SELECT public.get_user_id()));
