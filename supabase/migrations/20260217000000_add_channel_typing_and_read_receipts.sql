-- ============================================
-- Add missing channel_typing_indicators and channel_read_receipts tables
-- These tables are referenced by the app code but were never created.
-- ============================================

-- Typing indicators (ephemeral, shows "User is typing...")
CREATE TABLE IF NOT EXISTS channel_typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES server_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS channel_typing_channel_idx
  ON channel_typing_indicators(channel_id);

-- Read receipts (tracks last read per user per channel)
CREATE TABLE IF NOT EXISTS channel_read_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES server_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS channel_read_receipts_channel_idx
  ON channel_read_receipts(channel_id);
CREATE INDEX IF NOT EXISTS channel_read_receipts_user_idx
  ON channel_read_receipts(user_id);

-- Enable RLS
ALTER TABLE channel_typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_read_receipts ENABLE ROW LEVEL SECURITY;

-- Typing indicators: members can read/write their own
CREATE POLICY typing_select ON channel_typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM server_channels sc
      WHERE sc.id = channel_typing_indicators.channel_id
        AND (SELECT public.is_server_member(sc.server_id))
    )
  );

CREATE POLICY typing_insert ON channel_typing_indicators FOR INSERT
  WITH CHECK (user_id = (SELECT public.get_user_id()));

CREATE POLICY typing_update ON channel_typing_indicators FOR UPDATE
  USING (user_id = (SELECT public.get_user_id()));

CREATE POLICY typing_delete ON channel_typing_indicators FOR DELETE
  USING (user_id = (SELECT public.get_user_id()));

-- Read receipts: members can read/write their own
CREATE POLICY read_receipts_select ON channel_read_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM server_channels sc
      WHERE sc.id = channel_read_receipts.channel_id
        AND (SELECT public.is_server_member(sc.server_id))
    )
  );

CREATE POLICY read_receipts_upsert ON channel_read_receipts FOR INSERT
  WITH CHECK (user_id = (SELECT public.get_user_id()));

CREATE POLICY read_receipts_update ON channel_read_receipts FOR UPDATE
  USING (user_id = (SELECT public.get_user_id()));
