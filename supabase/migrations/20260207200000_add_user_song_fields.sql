-- Add song name and artist fields to users table for profile song
ALTER TABLE users ADD COLUMN IF NOT EXISTS song_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS song_artist TEXT;
