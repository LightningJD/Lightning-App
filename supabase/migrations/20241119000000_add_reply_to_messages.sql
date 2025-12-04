-- Add reply_to_message_id column to messages table for threaded replies
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Add index for reply lookups
CREATE INDEX IF NOT EXISTS messages_reply_to_idx ON messages(reply_to_message_id);

