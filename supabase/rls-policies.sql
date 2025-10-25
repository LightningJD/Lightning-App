-- ============================================
-- LIGHTNING APP - ROW LEVEL SECURITY POLICIES
-- ============================================
-- This file contains SQL commands to enable Row Level Security (RLS)
-- on all tables in the Lightning app database.
--
-- IMPORTANT: Run this file in your Supabase SQL Editor to enable RLS.
-- Without RLS, the database relies solely on application-level authorization.
--
-- To execute:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run"
--
-- Last Updated: 2025-10-25
-- ============================================

-- ============================================
-- HELPER FUNCTION: Get authenticated user ID
-- ============================================
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL STABLE;

-- ============================================
-- USERS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all public profiles
CREATE POLICY "Users can read public profiles"
ON users
FOR SELECT
USING (
  is_private = false
  OR auth.uid() = id
  OR auth.uid() IN (
    SELECT friend_id FROM friendships
    WHERE user_id = users.id AND status = 'accepted'
  )
);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users
FOR UPDATE
USING (auth.uid() = id);

-- Policy: Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
ON users
FOR INSERT
WITH CHECK (auth.uid() = clerk_user_id::uuid);

-- Policy: Users cannot delete profiles (soft delete only via app)
-- No DELETE policy = no deletions allowed

-- ============================================
-- TESTIMONIES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE testimonies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read public testimonies or their own
CREATE POLICY "Users can read public testimonies"
ON testimonies
FOR SELECT
USING (
  is_public = true
  OR auth.uid() = user_id
  OR (
    -- Friends can see friend-only testimonies
    auth.uid() IN (
      SELECT friend_id FROM friendships
      WHERE user_id = testimonies.user_id AND status = 'accepted'
    )
  )
);

-- Policy: Users can insert their own testimonies
CREATE POLICY "Users can insert own testimonies"
ON testimonies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own testimonies
CREATE POLICY "Users can update own testimonies"
ON testimonies
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own testimonies
CREATE POLICY "Users can delete own testimonies"
ON testimonies
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- TESTIMONY LIKES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE testimony_likes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all likes (for like counts)
CREATE POLICY "Users can read all likes"
ON testimony_likes
FOR SELECT
USING (true);

-- Policy: Users can insert their own likes
CREATE POLICY "Users can insert own likes"
ON testimony_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own likes
CREATE POLICY "Users can delete own likes"
ON testimony_likes
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- TESTIMONY VIEWS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE testimony_views ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all views (for view counts)
CREATE POLICY "Users can read all views"
ON testimony_views
FOR SELECT
USING (true);

-- Policy: Users can insert their own views
CREATE POLICY "Users can insert own views"
ON testimony_views
FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

-- ============================================
-- TESTIMONY COMMENTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE testimony_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read comments on testimonies they can see
CREATE POLICY "Users can read comments on visible testimonies"
ON testimony_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM testimonies
    WHERE id = testimony_comments.testimony_id
    AND (
      is_public = true
      OR auth.uid() = user_id
      OR auth.uid() IN (
        SELECT friend_id FROM friendships
        WHERE user_id = testimonies.user_id AND status = 'accepted'
      )
    )
  )
);

-- Policy: Users can insert comments on testimonies they can see
CREATE POLICY "Users can insert comments on visible testimonies"
ON testimony_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM testimonies
    WHERE id = testimony_comments.testimony_id
    AND (
      is_public = true
      OR auth.uid() = testimonies.user_id
      OR auth.uid() IN (
        SELECT friend_id FROM friendships
        WHERE user_id = testimonies.user_id AND status = 'accepted'
      )
    )
  )
);

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON testimony_comments
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- FRIENDSHIPS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own friendships (sent and received)
CREATE POLICY "Users can read own friendships"
ON friendships
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Policy: Users can insert friend requests they send
CREATE POLICY "Users can send friend requests"
ON friendships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update friendships they're part of (accept/decline)
CREATE POLICY "Users can update own friendships"
ON friendships
FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Policy: Users can delete friendships they're part of (unfriend)
CREATE POLICY "Users can delete own friendships"
ON friendships
FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================
-- MESSAGES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages they sent or received
CREATE POLICY "Users can read own messages"
ON messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy: Users can insert messages they send
CREATE POLICY "Users can send messages"
ON messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    -- Can message friends
    EXISTS (
      SELECT 1 FROM friendships
      WHERE user_id = auth.uid()
      AND friend_id = messages.receiver_id
      AND status = 'accepted'
    )
    OR
    -- Or if receiver allows messages from everyone
    EXISTS (
      SELECT 1 FROM users
      WHERE id = messages.receiver_id
      AND (message_privacy = 'everyone' OR message_privacy IS NULL)
    )
  )
);

-- Policy: Users can delete their own sent messages
CREATE POLICY "Users can delete own messages"
ON messages
FOR DELETE
USING (auth.uid() = sender_id);

-- ============================================
-- GROUPS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read public groups or groups they're members of
CREATE POLICY "Users can read public groups or member groups"
ON groups
FOR SELECT
USING (
  is_private = false
  OR auth.uid() IN (
    SELECT user_id FROM group_members
    WHERE group_id = groups.id
  )
);

-- Policy: Anyone can create groups
CREATE POLICY "Users can create groups"
ON groups
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- Policy: Group leaders can update groups
CREATE POLICY "Group leaders can update groups"
ON groups
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM group_members
    WHERE group_id = groups.id AND role = 'leader'
  )
);

-- Policy: Group leaders can delete groups
CREATE POLICY "Group leaders can delete groups"
ON groups
FOR DELETE
USING (
  auth.uid() IN (
    SELECT user_id FROM group_members
    WHERE group_id = groups.id AND role = 'leader'
  )
);

-- ============================================
-- GROUP MEMBERS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read members of groups they can see
CREATE POLICY "Users can read group members of visible groups"
ON group_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM groups
    WHERE id = group_members.group_id
    AND (
      is_private = false
      OR auth.uid() IN (
        SELECT user_id FROM group_members AS gm
        WHERE gm.group_id = groups.id
      )
    )
  )
);

-- Policy: Group leaders can add members
CREATE POLICY "Group leaders can add members"
ON group_members
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM group_members AS gm
    WHERE gm.group_id = group_members.group_id
    AND gm.role = 'leader'
  )
);

-- Policy: Group leaders can remove members, or users can remove themselves
CREATE POLICY "Leaders can remove members, users can leave"
ON group_members
FOR DELETE
USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT gm.user_id FROM group_members AS gm
    WHERE gm.group_id = group_members.group_id
    AND gm.role = 'leader'
  )
);

-- ============================================
-- GROUP MESSAGES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Group members can read group messages
CREATE POLICY "Group members can read messages"
ON group_messages
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM group_members
    WHERE group_id = group_messages.group_id
  )
);

-- Policy: Group members can send messages
CREATE POLICY "Group members can send messages"
ON group_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND auth.uid() IN (
    SELECT user_id FROM group_members
    WHERE group_id = group_messages.group_id
  )
);

-- Policy: Users can delete their own messages (or leaders can delete any)
CREATE POLICY "Users can delete own messages or leaders can delete any"
ON group_messages
FOR DELETE
USING (
  auth.uid() = sender_id
  OR auth.uid() IN (
    SELECT user_id FROM group_members
    WHERE group_id = group_messages.group_id
    AND role = 'leader'
  )
);

-- ============================================
-- BLOCKED USERS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own blocked list
CREATE POLICY "Users can read own blocked list"
ON blocked_users
FOR SELECT
USING (auth.uid() = blocker_id);

-- Policy: Users can block others
CREATE POLICY "Users can block others"
ON blocked_users
FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

-- Policy: Users can unblock others
CREATE POLICY "Users can unblock others"
ON blocked_users
FOR DELETE
USING (auth.uid() = blocker_id);

-- ============================================
-- REPORTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own reports
CREATE POLICY "Users can read own reports"
ON reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Policy: Users can create reports
CREATE POLICY "Users can create reports"
ON reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Policy: Only admins can update reports (no policy = no updates for normal users)
-- Policy: Only admins can delete reports (no policy = no deletes for normal users)

-- ============================================
-- ADMIN POLICIES (For moderators/admins)
-- ============================================

-- Note: To enable admin access, you need to:
-- 1. Create an admin role in Supabase Auth
-- 2. Add admin_role field to users table
-- 3. Add admin-specific policies here

-- Example admin policy for reports:
/*
CREATE POLICY "Admins can read all reports"
ON reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND admin_role = 'moderator' OR admin_role = 'admin'
  )
);
*/

-- ============================================
-- VERIFICATION
-- ============================================

-- Run these queries to verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- Expected: All tables should have rowsecurity = true

-- To view all policies:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

-- ============================================
-- TESTING RLS POLICIES
-- ============================================

-- Test as different users to ensure policies work correctly:
-- 1. Sign in as User A
-- 2. Try to read User B's private testimony (should fail)
-- 3. Try to update User B's profile (should fail)
-- 4. Try to delete User B's messages (should fail)
-- 5. Try to read public testimonies (should succeed)
-- 6. Try to update own profile (should succeed)

-- ============================================
-- ROLLBACK (Emergency Only)
-- ============================================

-- If you need to disable RLS (NOT RECOMMENDED for production):
/*
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
*/

-- ============================================
-- END OF FILE
-- ============================================
