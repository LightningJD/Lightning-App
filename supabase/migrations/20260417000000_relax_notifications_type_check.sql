-- ============================================
-- Relax notifications.type CHECK constraint
--
-- The original constraint from schema.sql pinned `type` to:
--   ('friend_request', 'message', 'group_invite', 'testimony_like', 'join_request')
--
-- But friends.ts inserts `type = 'friend_accepted'`, which was not in the
-- whitelist. On prod the constraint was already relaxed out-of-band, so
-- `friend_accepted` rows land fine there — this migration brings the repo
-- back in sync so a fresh deploy from the committed migrations matches prod.
--
-- Types currently inserted by app code:
--   - friends.ts   -> 'friend_accepted'
--   - messages.ts  -> 'message'
--   - groups.ts    -> 'group_invite'
--
-- Types reserved for upcoming work (kept in the whitelist):
--   - 'friend_request' (BUG-E fix: sendFriendRequest will insert this)
--   - 'testimony_like'
--   - 'join_request'
-- ============================================

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'friend_request',
    'friend_accepted',
    'message',
    'group_invite',
    'testimony_like',
    'join_request'
  ));
