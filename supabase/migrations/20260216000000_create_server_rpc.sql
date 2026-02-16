-- ============================================
-- LIGHTNING APP - RPC: create_server_with_defaults
-- ============================================
-- Creates a server with default roles, permissions, category, and #general channel
-- in a single transaction. Runs as SECURITY DEFINER to bypass RLS chicken-and-egg
-- issues during server creation (creator can't be a member before roles exist,
-- roles can't be created without admin status, etc.).
--
-- The function validates that the caller is the creator (via get_user_id())
-- so it cannot be abused to create servers as other users.
-- ============================================

CREATE OR REPLACE FUNCTION public.create_server_with_defaults(
  _name TEXT,
  _description TEXT DEFAULT '',
  _icon_emoji TEXT DEFAULT '⛪',
  _is_private BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _creator_id UUID;
  _server_id UUID;
  _owner_role_id UUID;
  _admin_role_id UUID;
  _mod_role_id UUID;
  _member_role_id UUID;
  _category_id UUID;
  _channel_id UUID;
  _invite_code TEXT;
  _server JSONB;
BEGIN
  -- 1. Get the current user's Supabase UUID from their Clerk JWT
  _creator_id := public.get_user_id();
  IF _creator_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Generate invite code
  _invite_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);

  -- 3. Create the server
  INSERT INTO public.servers (name, description, icon_emoji, creator_id, is_private, invite_code)
  VALUES (_name, _description, _icon_emoji, _creator_id, _is_private, _invite_code)
  RETURNING id INTO _server_id;

  -- 4. Create default roles
  INSERT INTO public.server_roles (server_id, name, color, position, is_default)
  VALUES (_server_id, 'Owner', '#F1C40F', 0, false)
  RETURNING id INTO _owner_role_id;

  INSERT INTO public.server_roles (server_id, name, color, position, is_default)
  VALUES (_server_id, 'Admin', '#E74C3C', 1, false)
  RETURNING id INTO _admin_role_id;

  INSERT INTO public.server_roles (server_id, name, color, position, is_default)
  VALUES (_server_id, 'Moderator', '#3498DB', 2, false)
  RETURNING id INTO _mod_role_id;

  INSERT INTO public.server_roles (server_id, name, color, position, is_default)
  VALUES (_server_id, 'Member', '#99AAB5', 3, true)
  RETURNING id INTO _member_role_id;

  -- 5. Add creator as member with Owner role
  INSERT INTO public.server_members (server_id, user_id, role_id)
  VALUES (_server_id, _creator_id, _owner_role_id);

  -- 6. Create permissions for each role
  INSERT INTO public.server_role_permissions
    (role_id, manage_server, manage_channels, manage_roles, manage_members,
     send_messages, pin_messages, delete_messages, create_invite, kick_members, ban_members)
  VALUES
    (_owner_role_id, true, true, true, true, true, true, true, true, true, true),
    (_admin_role_id, false, true, true, true, true, true, true, true, true, true),
    (_mod_role_id, false, false, false, true, true, true, true, true, true, false),
    (_member_role_id, false, false, false, false, true, false, false, true, false, false);

  -- 7. Create default "Text Channels" category
  INSERT INTO public.server_categories (server_id, name, position)
  VALUES (_server_id, 'Text Channels', 0)
  RETURNING id INTO _category_id;

  -- 8. Create #general channel
  INSERT INTO public.server_channels (server_id, category_id, name, topic, position)
  VALUES (_server_id, _category_id, 'general', 'General discussion', 0)
  RETURNING id INTO _channel_id;

  -- 9. Return the created server as JSON
  SELECT jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'description', s.description,
    'icon_emoji', s.icon_emoji,
    'creator_id', s.creator_id,
    'is_private', s.is_private,
    'invite_code', s.invite_code,
    'created_at', s.created_at
  ) INTO _server
  FROM public.servers s
  WHERE s.id = _server_id;

  RETURN _server;
END;
$$;

-- Grant execute to authenticated users (anon shouldn't create servers)
GRANT EXECUTE ON FUNCTION public.create_server_with_defaults(TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
