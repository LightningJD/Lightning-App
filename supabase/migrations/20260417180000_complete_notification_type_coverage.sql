-- ============================================
-- LIGHTNING APP - Complete notification type coverage
-- ============================================
-- The 20260417150000_tighten_notifications_insert_rls.sql migration
-- introduced `can_notify_user(target_user_id, notification_type)` with
-- branches for: friend_request, friend_accepted, group_invite, message,
-- and self. Unfortunately the notifications.type CHECK constraint also
-- accepts: testimony_like, testimony_comment (new here), join_request,
-- message_reaction (new here). Types the CHECK accepts but
-- can_notify_user() silently rejects cause client-side notification
-- INSERTs to fail open — the user action succeeds but the recipient
-- never gets a notification, which is exactly what E2E testing on
-- 2026-04-17 surfaced for:
--
--   BUG-I: testimony_comment — comments persist, no notification
--   BUG-J: message_reaction — reactions persist, no notification
--
-- This migration:
--   1. Extends notifications.type CHECK to include testimony_comment
--      and message_reaction (the two types that were never allowed).
--   2. Replaces can_notify_user() with branches covering every type
--      the CHECK allows, so no legitimate notification write is silently
--      dropped by RLS again.
-- ============================================

-- --------------------------------------------
-- 1. Extend the type CHECK constraint
-- --------------------------------------------
-- Existing CHECK (from the original + 20260417000000_relax_...sql):
--   friend_request, friend_accepted, message, group_invite,
--   testimony_like, join_request
-- Adding: testimony_comment, message_reaction

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type = ANY (ARRAY[
      'friend_request'::text,
      'friend_accepted'::text,
      'message'::text,
      'group_invite'::text,
      'testimony_like'::text,
      'testimony_comment'::text,
      'join_request'::text,
      'message_reaction'::text
    ])
  );

-- --------------------------------------------
-- 2. Replace can_notify_user() with full coverage
-- --------------------------------------------
-- Every branch below validates that the caller has recent, real
-- app-state backing the notification — so clients cannot fabricate
-- notifications they didn't earn. All branches follow the same pattern
-- used by the original migration: EXISTS on a concrete app-state row
-- that the caller has just written via its normal action path.

CREATE OR REPLACE FUNCTION public.can_notify_user(
  target_user_id UUID,
  notification_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller UUID := public.get_user_id();
BEGIN
  -- Must be authenticated
  IF _caller IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Self-notifications are always allowed (e.g. "You earned a badge")
  IF _caller = target_user_id THEN
    RETURN TRUE;
  END IF;

  -- ----------------------------------------
  -- friend_request: caller sent a pending friendship to target within 1h
  -- ----------------------------------------
  IF notification_type = 'friend_request' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.friendships
      WHERE user_id_1 = _caller
        AND user_id_2 = target_user_id
        AND status = 'pending'
        AND created_at > NOW() - INTERVAL '1 hour'
    );

  -- ----------------------------------------
  -- friend_accepted: caller has an accepted friendship row to target
  -- (the accept_friend_request RPC creates a caller→target 'accepted' row)
  -- ----------------------------------------
  ELSIF notification_type = 'friend_accepted' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.friendships
      WHERE user_id_1 = _caller
        AND user_id_2 = target_user_id
        AND status = 'accepted'
    );

  -- ----------------------------------------
  -- group_invite: caller created a group that target is a member of
  -- ----------------------------------------
  ELSIF notification_type = 'group_invite' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.group_members m ON m.group_id = g.id
      WHERE g.creator_id = _caller
        AND m.user_id = target_user_id
        AND g.created_at > NOW() - INTERVAL '1 hour'
    );

  -- ----------------------------------------
  -- message: caller sent a DM to target in the last 5 minutes
  -- ----------------------------------------
  ELSIF notification_type = 'message' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.messages
      WHERE sender_id = _caller
        AND recipient_id = target_user_id
        AND created_at > NOW() - INTERVAL '5 minutes'
    );

  -- ----------------------------------------
  -- testimony_like: caller liked a testimony owned by target in last 5 min
  -- ----------------------------------------
  ELSIF notification_type = 'testimony_like' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.testimony_likes tl
      JOIN public.testimonies t ON t.id = tl.testimony_id
      WHERE tl.user_id = _caller
        AND t.user_id = target_user_id
        AND tl.created_at > NOW() - INTERVAL '5 minutes'
    );

  -- ----------------------------------------
  -- testimony_comment: caller commented on a testimony owned by target
  -- within the last 5 minutes (BUG-I).
  -- ----------------------------------------
  ELSIF notification_type = 'testimony_comment' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.testimony_comments tc
      JOIN public.testimonies t ON t.id = tc.testimony_id
      WHERE tc.user_id = _caller
        AND t.user_id = target_user_id
        AND tc.created_at > NOW() - INTERVAL '5 minutes'
    );

  -- ----------------------------------------
  -- message_reaction: caller reacted to a DM sent by target within the
  -- last 5 minutes (BUG-J).
  -- ----------------------------------------
  ELSIF notification_type = 'message_reaction' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.message_reactions mr
      JOIN public.messages m ON m.id = mr.message_id
      WHERE mr.user_id = _caller
        AND m.sender_id = target_user_id
        AND mr.created_at > NOW() - INTERVAL '5 minutes'
    );

  -- ----------------------------------------
  -- join_request: caller submitted a pending join_request for a group
  -- whose creator is target, within the last hour.
  -- ----------------------------------------
  ELSIF notification_type = 'join_request' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.join_requests jr
      JOIN public.groups g ON g.id = jr.group_id
      WHERE jr.user_id = _caller
        AND g.creator_id = target_user_id
        AND jr.status = 'pending'
        AND jr.created_at > NOW() - INTERVAL '1 hour'
    );
  END IF;

  -- Unknown / unhandled types are rejected.
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.can_notify_user(UUID, TEXT) IS
  'Validates that the authenticated caller has legitimate authority to create a notification of the given type for target_user_id. Branches cover every value allowed by notifications_type_check. Used by notifications_insert RLS to prevent impersonation/spam.';
