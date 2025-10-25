-- ============================================
-- LIGHTNING APP - ROW LEVEL SECURITY POLICIES (CLERK AUTH)
-- ============================================
-- This file contains RLS policies that work with Clerk authentication.
--
-- IMPORTANT NOTES:
-- - Lightning uses Clerk for auth, NOT Supabase Auth
-- - Since Clerk users don't have Supabase auth.uid(), we use service role
-- - For now, we'll DISABLE RLS and rely on application-level authorization
-- - In production, you'd use Clerk JWT verification or service role
--
-- To execute:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run"
--
-- Last Updated: 2025-10-25
-- ============================================

-- ============================================
-- DISABLE RLS (Temporary - Clerk Auth)
-- ============================================
-- Since we're using Clerk (not Supabase Auth), auth.uid() is always NULL.
-- We'll disable RLS and rely on application-level authorization for now.

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE testimonies DISABLE ROW LEVEL SECURITY;
ALTER TABLE testimony_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE testimony_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE testimony_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies (if any were created)
DROP POLICY IF EXISTS "Users can read public profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can read public testimonies" ON testimonies;
DROP POLICY IF EXISTS "Users can insert own testimonies" ON testimonies;
DROP POLICY IF EXISTS "Users can update own testimonies" ON testimonies;
DROP POLICY IF EXISTS "Users can delete own testimonies" ON testimonies;

-- ============================================
-- WHY DISABLE RLS?
-- ============================================
-- Lightning uses Clerk for authentication, which is external to Supabase.
-- Supabase's auth.uid() only works with Supabase Auth.
--
-- Options for production:
-- 1. Use Supabase service role key (bypasses RLS) - CURRENT APPROACH
-- 2. Implement Clerk JWT verification in RLS policies (complex)
-- 3. Migrate to Supabase Auth (requires re-authentication)
--
-- For now, security is enforced at the application level:
-- - Clerk handles authentication
-- - App code checks authorization before database operations
-- - Input validation prevents malicious data
-- ============================================

-- Verify RLS is disabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected output: All tables should have rowsecurity = false
