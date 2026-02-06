-- Lightning App - Discord-Style Servers Migration
-- Adds server infrastructure with channels, roles, and permissions

-- ============================================
-- SERVERS TABLE (replaces groups for Discord-style functionality)
-- ============================================
CREATE TABLE servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon_emoji TEXT DEFAULT '⛪',
  icon_url TEXT,
  banner_url TEXT,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE,
  is_private BOOLEAN DEFAULT false,
  member_count INTEGER DEFAULT 0,
  max_members INTEGER DEFAULT 500,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX servers_creator_id_idx ON servers(creator_id);
CREATE INDEX servers_invite_code_idx ON servers(invite_code);

-- ============================================
-- SERVER CATEGORIES (organize channels into groups)
-- ============================================
CREATE TABLE server_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX server_categories_server_id_idx ON server_categories(server_id);

-- ============================================
-- SERVER CHANNELS (text channels within a server)
-- ============================================
CREATE TABLE server_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES server_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  topic TEXT,
  position INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX server_channels_server_id_idx ON server_channels(server_id);
CREATE INDEX server_channels_category_id_idx ON server_channels(category_id);

-- ============================================
-- SERVER ROLES (custom roles per server)
-- ============================================
CREATE TABLE server_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#99AAB5',
  position INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX server_roles_server_id_idx ON server_roles(server_id);

-- ============================================
-- SERVER ROLE PERMISSIONS (granular permission flags)
-- ============================================
CREATE TABLE server_role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES server_roles(id) ON DELETE CASCADE UNIQUE,
  manage_server BOOLEAN DEFAULT false,
  manage_channels BOOLEAN DEFAULT false,
  manage_roles BOOLEAN DEFAULT false,
  manage_members BOOLEAN DEFAULT false,
  send_messages BOOLEAN DEFAULT true,
  pin_messages BOOLEAN DEFAULT false,
  delete_messages BOOLEAN DEFAULT false,
  create_invite BOOLEAN DEFAULT false,
  kick_members BOOLEAN DEFAULT false,
  ban_members BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX server_role_permissions_role_id_idx ON server_role_permissions(role_id);

-- ============================================
-- SERVER MEMBERS (membership with assigned role)
-- ============================================
CREATE TABLE server_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES server_roles(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

CREATE INDEX server_members_server_id_idx ON server_members(server_id);
CREATE INDEX server_members_user_id_idx ON server_members(user_id);

-- ============================================
-- CHANNEL MESSAGES (messages scoped to a channel)
-- ============================================
CREATE TABLE channel_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES server_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  pinned_by UUID REFERENCES users(id),
  pinned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX channel_messages_channel_id_idx ON channel_messages(channel_id);
CREATE INDEX channel_messages_sender_id_idx ON channel_messages(sender_id);
CREATE INDEX channel_messages_created_at_idx ON channel_messages(created_at DESC);

-- ============================================
-- CHANNEL MESSAGE REACTIONS (emoji reactions)
-- ============================================
CREATE TABLE channel_message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES channel_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX channel_message_reactions_message_id_idx ON channel_message_reactions(message_id);

-- ============================================
-- SERVER JOIN REQUESTS (for private servers)
-- ============================================
CREATE TABLE server_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

CREATE INDEX server_join_requests_server_id_idx ON server_join_requests(server_id);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER servers_updated_at BEFORE UPDATE ON servers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER server_categories_updated_at BEFORE UPDATE ON server_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER server_channels_updated_at BEFORE UPDATE ON server_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER server_roles_updated_at BEFORE UPDATE ON server_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER server_role_permissions_updated_at BEFORE UPDATE ON server_role_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER channel_messages_updated_at BEFORE UPDATE ON channel_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER server_join_requests_updated_at BEFORE UPDATE ON server_join_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUTO-UPDATE member_count TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_server_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE servers SET member_count = member_count + 1 WHERE id = NEW.server_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE servers SET member_count = member_count - 1 WHERE id = OLD.server_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER server_members_count_trigger
  AFTER INSERT OR DELETE ON server_members
  FOR EACH ROW EXECUTE FUNCTION update_server_member_count();

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_join_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (permissive - app handles authorization)
-- ============================================

-- Servers: anyone can read public servers, members can read private
CREATE POLICY "servers_select" ON servers FOR SELECT USING (true);
CREATE POLICY "servers_insert" ON servers FOR INSERT WITH CHECK (true);
CREATE POLICY "servers_update" ON servers FOR UPDATE USING (true);
CREATE POLICY "servers_delete" ON servers FOR DELETE USING (true);

-- Categories, Channels, Roles, Permissions: accessible to server members
CREATE POLICY "server_categories_all" ON server_categories USING (true);
CREATE POLICY "server_channels_all" ON server_channels USING (true);
CREATE POLICY "server_roles_all" ON server_roles USING (true);
CREATE POLICY "server_role_permissions_all" ON server_role_permissions USING (true);

-- Members
CREATE POLICY "server_members_all" ON server_members USING (true);
CREATE POLICY "server_members_insert" ON server_members FOR INSERT WITH CHECK (true);
CREATE POLICY "server_members_delete" ON server_members FOR DELETE USING (true);

-- Messages and reactions
CREATE POLICY "channel_messages_all" ON channel_messages USING (true);
CREATE POLICY "channel_messages_insert" ON channel_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "channel_message_reactions_all" ON channel_message_reactions USING (true);
CREATE POLICY "channel_message_reactions_insert" ON channel_message_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "channel_message_reactions_delete" ON channel_message_reactions FOR DELETE USING (true);

-- Join requests
CREATE POLICY "server_join_requests_all" ON server_join_requests USING (true);
CREATE POLICY "server_join_requests_insert" ON server_join_requests FOR INSERT WITH CHECK (true);
