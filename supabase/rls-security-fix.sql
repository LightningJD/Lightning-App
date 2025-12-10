-- ============================================
-- LIGHTNING APP - COMPLETE RLS FIX (CORRECTED)
-- ============================================
-- 1. Fixed "permission denied" error (removed auth.user_id function).
-- 2. Aligned with schema.sql using clerk_user_id for correct access control.
-- ============================================

-- ============================================
-- 1. USERS
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read public profiles" ON users;
CREATE POLICY "Users can read public profiles" ON users FOR SELECT
USING (true); -- As per schema.sql, profiles are generally public? Or use privacy flag:
-- USING (is_profile_private = false OR auth.uid()::text = clerk_user_id); 
-- Sticking to schema.sql guidance: "Users are viewable by everyone"
-- If you want privacy, uncomment the line below and comment "USING (true)":
-- USING (is_profile_private = false OR auth.uid()::text = clerk_user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = clerk_user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = clerk_user_id);

-- ============================================
-- 2. TESTIMONIES
-- ============================================
ALTER TABLE testimonies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read public testimonies" ON testimonies;
CREATE POLICY "Users can read public testimonies" ON testimonies FOR SELECT
USING (is_public = true OR user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can insert own testimonies" ON testimonies;
CREATE POLICY "Users can insert own testimonies" ON testimonies FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update own testimonies" ON testimonies;
CREATE POLICY "Users can update own testimonies" ON testimonies FOR UPDATE 
USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete own testimonies" ON testimonies;
CREATE POLICY "Users can delete own testimonies" ON testimonies FOR DELETE 
USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- ============================================
-- 3. TESTIMONY LIKES
-- ============================================
ALTER TABLE testimony_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read all likes" ON testimony_likes;
CREATE POLICY "Users can read all likes" ON testimony_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own likes" ON testimony_likes;
CREATE POLICY "Users can insert own likes" ON testimony_likes FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete own likes" ON testimony_likes;
CREATE POLICY "Users can delete own likes" ON testimony_likes FOR DELETE 
USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- ============================================
-- 4. TESTIMONY VIEWS
-- ============================================
ALTER TABLE testimony_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read all views" ON testimony_views;
CREATE POLICY "Users can read all views" ON testimony_views FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own views" ON testimony_views;
CREATE POLICY "Users can insert own views" ON testimony_views FOR INSERT 
WITH CHECK (viewer_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- ============================================
-- 5. TESTIMONY COMMENTS
-- ============================================
ALTER TABLE testimony_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read comments" ON testimony_comments;
CREATE POLICY "Users can read comments" ON testimony_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM testimonies WHERE id = testimony_comments.testimony_id AND (is_public = true OR user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)))
);

DROP POLICY IF EXISTS "Users can insert comments" ON testimony_comments;
CREATE POLICY "Users can insert comments" ON testimony_comments FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete own comments" ON testimony_comments;
CREATE POLICY "Users can delete own comments" ON testimony_comments FOR DELETE 
USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- ============================================
-- 6. FRIENDSHIPS
-- ============================================
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own friendships" ON friendships;
CREATE POLICY "Users can read own friendships" ON friendships FOR SELECT 
USING (
    user_id_1 IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text) OR 
    user_id_2 IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);

DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
CREATE POLICY "Users can create friendships" ON friendships FOR INSERT 
WITH CHECK (requested_by IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update own friendships" ON friendships;
CREATE POLICY "Users can update own friendships" ON friendships FOR UPDATE 
USING (
    user_id_1 IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text) OR 
    user_id_2 IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);

DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;
CREATE POLICY "Users can delete own friendships" ON friendships FOR DELETE 
USING (
    user_id_1 IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text) OR 
    user_id_2 IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);

-- ============================================
-- 7. MESSAGES
-- ============================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own messages" ON messages;
CREATE POLICY "Users can read own messages" ON messages FOR SELECT 
USING (
    sender_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text) OR 
    recipient_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages FOR INSERT 
WITH CHECK (sender_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE 
USING (sender_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- ============================================
-- 8. MESSAGE REACTIONS
-- ============================================
ALTER TABLE IF EXISTS message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read reactions" ON message_reactions;
CREATE POLICY "Users can read reactions" ON message_reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can react" ON message_reactions;
CREATE POLICY "Users can react" ON message_reactions FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete own reactions" ON message_reactions;
CREATE POLICY "Users can delete own reactions" ON message_reactions FOR DELETE 
USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- ============================================
-- 9. GROUPS
-- ============================================
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read groups" ON groups;
CREATE POLICY "Users can read groups" ON groups FOR SELECT USING (
  is_private = false OR 
  EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
);

DROP POLICY IF EXISTS "Users can create groups" ON groups;
CREATE POLICY "Users can create groups" ON groups FOR INSERT 
WITH CHECK (creator_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Leaders can update groups" ON groups;
CREATE POLICY "Leaders can update groups" ON groups FOR UPDATE USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND role IN ('leader', 'co-leader') AND user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
);

DROP POLICY IF EXISTS "Leaders can delete groups" ON groups;
CREATE POLICY "Leaders can delete groups" ON groups FOR DELETE USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND role IN ('leader', 'co-leader') AND user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
);

-- ============================================
-- 10. GROUP MEMBERS
-- ============================================
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members" ON group_members;
CREATE POLICY "Users can view members" ON group_members FOR SELECT USING (
   EXISTS (SELECT 1 FROM groups WHERE id = group_members.group_id AND (is_private = false OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = groups.id AND gm.user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))))
);

DROP POLICY IF EXISTS "Leaders can add members" ON group_members;
CREATE POLICY "Leaders can add members" ON group_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.role IN ('leader', 'co-leader') AND gm.user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
  OR user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text) -- Self join
);

DROP POLICY IF EXISTS "Members can leave or be removed" ON group_members;
CREATE POLICY "Members can leave or be removed" ON group_members FOR DELETE USING (
  user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text) OR 
  EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.role IN ('leader', 'co-leader') AND gm.user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
);

-- ============================================
-- 11. GROUP MESSAGES
-- ============================================
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read messages" ON group_messages;
CREATE POLICY "Members can read messages" ON group_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
);

DROP POLICY IF EXISTS "Members can send messages" ON group_messages;
CREATE POLICY "Members can send messages" ON group_messages FOR INSERT WITH CHECK (
  sender_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text) AND
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
);

-- ============================================
-- 12. JOIN REQUESTS
-- ============================================
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own requests" ON join_requests;
CREATE POLICY "Users view own requests" ON join_requests FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);

DROP POLICY IF EXISTS "Leaders view requests" ON join_requests;
CREATE POLICY "Leaders view requests" ON join_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = join_requests.group_id AND role IN ('leader', 'co-leader') AND user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
);

DROP POLICY IF EXISTS "Users create requests" ON join_requests;
CREATE POLICY "Users create requests" ON join_requests FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);

DROP POLICY IF EXISTS "Leaders update requests" ON join_requests;
CREATE POLICY "Leaders update requests" ON join_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = join_requests.group_id AND role IN ('leader', 'co-leader') AND user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
);

-- ============================================
-- 13. NOTIFICATIONS
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);

-- ============================================
-- 14. BLOCKED USERS
-- ============================================
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View blocked" ON blocked_users;
CREATE POLICY "View blocked" ON blocked_users FOR SELECT USING (
    blocker_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);

DROP POLICY IF EXISTS "Block user" ON blocked_users;
CREATE POLICY "Block user" ON blocked_users FOR INSERT WITH CHECK (
    blocker_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);

DROP POLICY IF EXISTS "Unblock user" ON blocked_users;
CREATE POLICY "Unblock user" ON blocked_users FOR DELETE USING (
    blocker_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);

-- ============================================
-- 15. SPATIAL REF SYS
-- ============================================
-- Skipped: spatial_ref_sys is a system table managed by PostGIS. 
-- Modifying its RLS requires superuser permissions which are restricted in Supabase.
-- It is generally safe as it only contains reference data for coordinate systems.
