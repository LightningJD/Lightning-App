-- Migration: Add location_city column and update find_nearby_users RPC function
-- Date: October 23, 2025
-- Run this in Supabase SQL Editor

-- Add location_city column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_city TEXT;

-- Update the find_nearby_users RPC function to return all needed fields
CREATE OR REPLACE FUNCTION find_nearby_users(user_lat DECIMAL, user_lng DECIMAL, radius_miles INTEGER DEFAULT 25)
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    avatar_emoji TEXT,
    avatar_url TEXT,
    bio TEXT,
    location_city TEXT,
    is_online BOOLEAN,
    has_testimony BOOLEAN,
    distance_miles DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_emoji,
        u.avatar_url,
        u.bio,
        u.location_city,
        u.is_online,
        u.has_testimony,
        ROUND(
            ST_Distance(
                u.location_point,
                ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
            ) * 0.000621371, -- Convert meters to miles
            1
        ) as distance_miles
    FROM users u
    WHERE u.location_point IS NOT NULL
    AND ST_DWithin(
        u.location_point,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_miles * 1609.34 -- Convert miles to meters
    )
    ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql;
