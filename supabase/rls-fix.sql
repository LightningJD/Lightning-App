-- ============================================
-- LIGHTNING APP - DISABLE RLS (SAFE VERSION)
-- ============================================
-- This script safely disables RLS on all existing tables
-- and ignores tables that don't exist yet.
--
-- Execute in Supabase Dashboard → SQL Editor
-- ============================================

-- Disable RLS on existing tables (ignore errors if table doesn't exist)
DO $$
BEGIN
    -- Core tables
    ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS testimonies DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS testimony_likes DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS testimony_views DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS testimony_comments DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS friendships DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS message_reactions DISABLE ROW LEVEL SECURITY;

    -- Group tables
    ALTER TABLE IF EXISTS groups DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS group_members DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS group_messages DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS join_requests DISABLE ROW LEVEL SECURITY;

    -- Moderation tables
    ALTER TABLE IF EXISTS blocked_users DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS reports DISABLE ROW LEVEL SECURITY;

    RAISE NOTICE 'RLS disabled on all existing tables';
END $$;

-- Drop any existing policies (ignore errors if they don't exist)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can read public profiles" ON users;
    DROP POLICY IF EXISTS "Users can update own profile" ON users;
    DROP POLICY IF EXISTS "Users can insert own profile" ON users;
    DROP POLICY IF EXISTS "Users can read public testimonies" ON testimonies;
    DROP POLICY IF EXISTS "Users can insert own testimonies" ON testimonies;
    DROP POLICY IF EXISTS "Users can update own testimonies" ON testimonies;
    DROP POLICY IF EXISTS "Users can delete own testimonies" ON testimonies;

    RAISE NOTICE 'All RLS policies dropped';
END $$;

-- Verify RLS is disabled on existing tables
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: All tables should show rowsecurity = false
