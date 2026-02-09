-- ============================================
-- Migration: Server Features (Discord Parity)
-- Date: 2026-02-08
-- Features: Server icon upload, slowmode, timeout,
--           default notifications, welcome messages,
--           ownership transfer, audit log
-- ============================================

-- 1. Add icon_url to servers (for uploaded server icons)
ALTER TABLE servers ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- 2. Add default_notification_level to servers
-- Values: 'all' (all messages), 'mentions' (only @mentions), 'none'
ALTER TABLE servers ADD COLUMN IF NOT EXISTS default_notification_level TEXT DEFAULT 'all';

-- 3. Add welcome_message and welcome_enabled to servers
ALTER TABLE servers ADD COLUMN IF NOT EXISTS welcome_message TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS welcome_enabled BOOLEAN DEFAULT false;

-- 4. Add slowmode_seconds to server_channels
-- 0 = disabled, values: 5, 10, 15, 30, 60, 120, 300, 600
ALTER TABLE server_channels ADD COLUMN IF NOT EXISTS slowmode_seconds INTEGER DEFAULT 0;

-- 5. Add timed_out_until to server_members
ALTER TABLE server_members ADD COLUMN IF NOT EXISTS timed_out_until TIMESTAMPTZ;

-- 6. Create server_audit_log table
CREATE TABLE IF NOT EXISTS server_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES users(id),
  target_type TEXT, -- 'member', 'channel', 'role', 'server', etc.
  target_id TEXT,   -- ID of the affected entity
  target_name TEXT, -- Display name for the log entry
  details JSONB,    -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_server ON server_audit_log(server_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON server_audit_log(server_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON server_audit_log(server_id, action_type);

-- 7. Create channel_notification_overrides table
CREATE TABLE IF NOT EXISTS channel_notification_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES server_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'default', -- 'default', 'all', 'mentions', 'none'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_notif_user ON channel_notification_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_notif_channel ON channel_notification_overrides(channel_id);

-- 8. Enable RLS on new tables
ALTER TABLE server_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_notification_overrides ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit log (read-only for members, insert for system)
CREATE POLICY "Members can view audit log" ON server_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_members.server_id = server_audit_log.server_id
      AND server_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert audit log" ON server_audit_log
  FOR INSERT WITH CHECK (true);

-- RLS policies for channel notification overrides
CREATE POLICY "Users can view own notification overrides" ON channel_notification_overrides
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own notification overrides" ON channel_notification_overrides
  FOR ALL USING (user_id = auth.uid());
