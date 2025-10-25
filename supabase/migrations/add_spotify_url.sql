-- Add spotify_url column to users table
-- Migration created: October 24, 2025

-- Add spotify_url column for Spotify profile link
ALTER TABLE users
ADD COLUMN IF NOT EXISTS spotify_url TEXT;

-- Comment on column
COMMENT ON COLUMN users.spotify_url IS 'User Spotify profile URL (e.g., https://open.spotify.com/user/...)';
