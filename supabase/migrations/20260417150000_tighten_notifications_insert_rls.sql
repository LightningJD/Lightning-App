-- ============================================
-- LIGHTNING APP - Tighten notifications INSERT RLS
-- ============================================
-- Before this migration, public.notifications_insert was `WITH CHECK (true)`.
-- Any authenticated client could insert a notification for any user, which
-- is an impersonation vector — an attacker could create fake
-- "Your account has been suspended" / "You won $100" notifications for
-- other users.
--
-- The Supabase security advisor flags this as rls_policy_always_true.
--
-- Fix: a SECURITY DEFINER helper `can_notify_user(target, type)` validates
-- that the authenticated caller has legitimate authority to send that
-- notification type to that target. The check runs server-side against
-- real app-state tables (friendships, groups, group_members, messages),
-- so clients can't spoof it.
--
-- This migration is backwards-compatible with the current client code:
-- every existing client-side notification insert (friends.ts, groups.ts,
-- messages.ts) fires *after* the action that authorizes it, so by the
-- time the notification INSERT arrives, the supporting row (friendship,
-- group+member, message) is already committed and visible to the helper.
-- ============================================

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

  -- Self-notifications are always allowed (rare, but semantically fine —
  -- e.g. "You earned a badge" written by the user's own client)
  IF _caller = target_user_id THEN
    RETURN TRUE;
  END IF;

  -- Per-type validations: the caller must have performed a recent
  -- app-state action that justifies sending this notification to target.
  IF notification_type = 'friend_request' THEN
    -- Caller sent a pending friend request to target within the last hour
    RETURN EXISTS (
      SELECT 1 FROM public.friendships
      WHERE user_id_1 = _caller
        AND user_id_2 = target_user_id
        AND status = 'pending'
        AND created_at > NOW() - INTERVAL '1 hour'
    );

  ELSIF notification_type = 'friend_accepted' THEN
    -- An accepted friendship exists where caller is on the accepter side
    -- (the accept_friend_request RPC creates both direction rows, so the
    -- caller — accepter — has a caller→target 'accepted' row).
    RETURN EXISTS (
      SELECT 1 FROM public.friendships
      WHERE user_id_1 = _caller
        AND user_id_2 = target_user_id
        AND status = 'accepted'
    );

  ELSIF notification_type = 'group_invite' THEN
    -- Caller created a group that target was invited to (became a member of)
    RETURN EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.group_members m ON m.group_id = g.id
      WHERE g.creator_id = _caller
        AND m.user_id = target_user_id
        AND g.created_at > NOW() - INTERVAL '1 hour'
    );

  ELSIF notification_type = 'message' THEN
    -- Caller sent a DM to target in the last 5 minutes
    RETURN EXISTS (
      SELECT 1 FROM public.messages
      WHERE sender_id = _caller
        AND recipient_id = target_user_id
        AND created_at > NOW() - INTERVAL '5 minutes'
    );
  END IF;

  -- Unknown / unhandled types are rejected. Adding a new notification type
  -- requires adding a corresponding validation branch here.
  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.can_notify_user(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_notify_user(UUID, TEXT) TO authenticated, anon;

COMMENT ON FUNCTION public.can_notify_user(UUID, TEXT) IS
  'Validates that the authenticated caller has legitimate authority to create a notification of the given type for target_user_id. Used by notifications_insert RLS to prevent impersonation/spam.';

-- Swap the permissive policy for a validated one.
DROP POLICY IF EXISTS notifications_insert ON public.notifications;

CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT
  WITH CHECK (public.can_notify_user(user_id, type));

COMMENT ON POLICY notifications_insert ON public.notifications IS
  'Allows inserts only when the authenticated caller has recent app-state proving they can legitimately notify user_id about `type`. See can_notify_user().';
