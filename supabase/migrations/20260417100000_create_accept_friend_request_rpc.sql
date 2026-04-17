-- ============================================
-- LIGHTNING APP - RPC: accept_friend_request
-- ============================================
-- Accepts a pending friend request atomically: flips the original row to
-- 'accepted' AND inserts the reverse friendship row in a single transaction.
--
-- Before this RPC, the client code ran two separate round-trips:
--   1) UPDATE friendships SET status='accepted' WHERE id=$1
--   2) INSERT INTO friendships (reverse row) VALUES (...)
-- With a manual compensating UPDATE on step-2 failure. If the compensation
-- ALSO failed (connectivity blip, RLS drift, etc.), we left the rows in a
-- half-committed state: one-way friendship with no reverse, which makes
-- the requester look like a friend to the accepter but not vice versa.
--
-- This RPC wraps both statements in a single Postgres transaction: both
-- rows commit or neither does.
--
-- Authorization:
--   - SECURITY DEFINER to bypass RLS (we validate permissions ourselves)
--   - Caller must be a party to the friendship (user_id_1 or user_id_2)
--   - The original row must currently be 'pending' (prevents replay)
-- ============================================

CREATE OR REPLACE FUNCTION public.accept_friend_request(
  _request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID;
  _user_id_1 UUID;
  _user_id_2 UUID;
  _status TEXT;
  _updated_row public.friendships%ROWTYPE;
BEGIN
  -- 1. Identify caller
  _caller_id := public.get_user_id();
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- 2. Load the target row and validate state + authorization
  SELECT user_id_1, user_id_2, status
    INTO _user_id_1, _user_id_2, _status
  FROM public.friendships
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found' USING ERRCODE = 'P0002';
  END IF;

  IF _status <> 'pending' THEN
    RAISE EXCEPTION 'Friend request is not pending (current status: %)', _status
      USING ERRCODE = '22023';
  END IF;

  -- Only a party to the friendship may accept it. Matches the existing
  -- RLS UPDATE policy (friendships_update_participant).
  IF _caller_id <> _user_id_1 AND _caller_id <> _user_id_2 THEN
    RAISE EXCEPTION 'Not authorized to accept this request' USING ERRCODE = '42501';
  END IF;

  -- 3. Flip status to accepted, capture the updated row for return
  UPDATE public.friendships
  SET status = 'accepted'
  WHERE id = _request_id
  RETURNING * INTO _updated_row;

  -- 4. Insert the reverse friendship row. Both this and the UPDATE above
  -- are part of the same implicit transaction — if the INSERT fails
  -- (unique violation, RLS, etc.) Postgres rolls back the UPDATE for us,
  -- so we never leave half-committed state.
  INSERT INTO public.friendships (user_id_1, user_id_2, status, requested_by)
  VALUES (_user_id_2, _user_id_1, 'accepted', _user_id_2);

  -- 5. Return the accepted row as JSONB so the caller can show it as a
  -- friend without a second SELECT.
  RETURN to_jsonb(_updated_row);
END;
$$;

-- Grant execute to authenticated users (and anon for Clerk JWT callers,
-- matching the pattern used elsewhere in this schema).
REVOKE ALL ON FUNCTION public.accept_friend_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated, anon;

COMMENT ON FUNCTION public.accept_friend_request(UUID) IS
  'Atomically accept a pending friend request: flips the original row to accepted and inserts the reverse friendship row in one transaction. See migration 20260417100000 for motivation.';
