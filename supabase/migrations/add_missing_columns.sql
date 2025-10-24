-- Add missing columns to users table

-- Add location_city column (for user's city/location display)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS location_city TEXT;

-- Ensure avatar_url exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
