-- Channel Role Access: controls which roles can see private channels
-- When a channel has is_private = true, only roles listed here (plus manage_channels users) can see it

CREATE TABLE channel_role_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES server_channels(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES server_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(channel_id, role_id)
);

CREATE INDEX idx_channel_role_access_channel ON channel_role_access(channel_id);
CREATE INDEX idx_channel_role_access_role ON channel_role_access(role_id);

-- RLS: permissive (app handles authorization, matching existing pattern)
ALTER TABLE channel_role_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channel_role_access_all" ON channel_role_access USING (true);
CREATE POLICY "channel_role_access_insert" ON channel_role_access FOR INSERT WITH CHECK (true);
CREATE POLICY "channel_role_access_delete" ON channel_role_access FOR DELETE USING (true);
