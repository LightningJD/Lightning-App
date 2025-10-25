-- Add search radius preference to users table
-- Migration created: October 24, 2025

-- Add search_radius column (in miles, default 25)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS search_radius INTEGER DEFAULT 25 CHECK (search_radius >= 5 AND search_radius <= 100);

-- Comment on column
COMMENT ON COLUMN users.search_radius IS 'User preferred search radius in miles (5-100, default 25)';
