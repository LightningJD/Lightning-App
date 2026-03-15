-- Add relationship_status column to users table for faith profile
ALTER TABLE users ADD COLUMN IF NOT EXISTS relationship_status TEXT;
