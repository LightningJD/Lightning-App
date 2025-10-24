-- Add avatar_url column to users table if it doesn't exist
-- This allows profile picture uploads from Cloudinary

ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
