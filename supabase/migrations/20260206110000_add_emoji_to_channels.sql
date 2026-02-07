-- Add emoji_icon column to server_channels for custom channel emoji
ALTER TABLE server_channels
ADD COLUMN IF NOT EXISTS emoji_icon TEXT;
