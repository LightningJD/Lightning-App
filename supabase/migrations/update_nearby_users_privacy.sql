-- Update find_nearby_users RPC to respect privacy settings
-- Migration created: October 25, 2025

-- This migration updates the find_nearby_users function to:
-- 1. Filter out users with is_private = true (unless they're friends)
-- 2. Filter out users with notify_nearby = false (hidden from Connect tab)

CREATE OR REPLACE FUNCTION find_nearby_users(
    user_lat DECIMAL,
    user_lng DECIMAL,
    radius_miles INTEGER DEFAULT 25,
    current_user_id UUID DEFAULT NULL
)
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
        ) AS distance_miles
    FROM users u
    WHERE u.location_point IS NOT NULL
    AND ST_DWithin(
        u.location_point,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_miles * 1609.34 -- Convert miles to meters
    )
    -- Privacy filters
    AND (u.notify_nearby IS NULL OR u.notify_nearby = true) -- User wants to be visible in Connect
    AND (
        u.is_private IS NULL
        OR u.is_private = false
        OR (
            -- If user is private, only show to friends
            current_user_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM friends
                WHERE (user_id = current_user_id AND friend_id = u.id AND status = 'accepted')
                   OR (user_id = u.id AND friend_id = current_user_id AND status = 'accepted')
            )
        )
    )
    ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql;

-- Comment on function
COMMENT ON FUNCTION find_nearby_users IS 'Finds nearby users within radius, respecting privacy settings (is_private, notify_nearby)';
