-- Add reply_to_id column to channel_messages for threaded replies
ALTER TABLE channel_messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES channel_messages(id) ON DELETE SET NULL;

-- Add is_edited column to channel_messages for edit tracking
ALTER TABLE channel_messages
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

-- Add index for reply lookups
CREATE INDEX IF NOT EXISTS channel_messages_reply_to_id_idx ON channel_messages(reply_to_id);
