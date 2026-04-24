-- Remove is_private filter from find_nearby_users
-- The is_private flag was causing users to be hidden from Connect tab unexpectedly.
-- notify_nearby=false remains the correct way to opt out of nearby discovery.

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
            ) * 0.000621371,
            1
        ) AS distance_miles
    FROM users u
    WHERE u.location_point IS NOT NULL
    AND ST_DWithin(
        u.location_point,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_miles * 1609.34
    )
    AND (u.notify_nearby IS NULL OR u.notify_nearby = true)
    ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_nearby_users IS 'Finds nearby users within radius. Respects notify_nearby preference. is_private no longer filters nearby visibility.';
