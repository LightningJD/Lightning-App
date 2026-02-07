-- Add image_url column to all message tables for image sharing

-- DMs
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Channel messages (servers)
ALTER TABLE channel_messages
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Group messages
ALTER TABLE group_messages
ADD COLUMN IF NOT EXISTS image_url TEXT;
