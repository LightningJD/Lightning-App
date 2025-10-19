-- Lightning App Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- Enable PostGIS extension for location features
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  avatar_emoji TEXT DEFAULT '👤',
  bio TEXT,
  location_lat DECIMAL,
  location_lng DECIMAL,
  location_point GEOGRAPHY(POINT, 4326), -- PostGIS point for spatial queries
  has_testimony BOOLEAN DEFAULT false,
  is_profile_private BOOLEAN DEFAULT false,
  search_radius_miles INTEGER DEFAULT 25,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for geospatial queries (nearby users)
CREATE INDEX users_location_idx ON users USING GIST(location_point);

-- Index for Clerk user lookup
CREATE INDEX users_clerk_user_id_idx ON users(clerk_user_id);

-- Index for username lookup
CREATE INDEX users_username_idx ON users(username);

-- ============================================
-- TESTIMONIES TABLE
-- ============================================
CREATE TABLE testimonies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'My Testimony',
  content TEXT NOT NULL, -- 4-paragraph formatted testimony
  lesson TEXT, -- Key lesson learned
  question1_answer TEXT NOT NULL, -- Life before saved
  question2_answer TEXT NOT NULL, -- What led to salvation
  question3_answer TEXT NOT NULL, -- Specific moment/encounter
  question4_answer TEXT NOT NULL, -- Current mission/calling
  word_count INTEGER,
  is_public BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  music_spotify_url TEXT,
  music_track_name TEXT,
  music_artist TEXT,
  music_audio_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for user's testimony lookup
CREATE INDEX testimonies_user_id_idx ON testimonies(user_id);

-- Index for public testimonies
CREATE INDEX testimonies_public_idx ON testimonies(is_public) WHERE is_public = true;

-- ============================================
-- FRIENDSHIPS TABLE
-- ============================================
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  requested_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

-- Index for friendship lookups
CREATE INDEX friendships_user1_idx ON friendships(user_id_1);
CREATE INDEX friendships_user2_idx ON friendships(user_id_2);
CREATE INDEX friendships_status_idx ON friendships(status);

-- ============================================
-- MESSAGES TABLE (Direct Messages)
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for conversation lookups
CREATE INDEX messages_sender_idx ON messages(sender_id);
CREATE INDEX messages_recipient_idx ON messages(recipient_id);
CREATE INDEX messages_created_at_idx ON messages(created_at DESC);

-- Index for unread messages
CREATE INDEX messages_unread_idx ON messages(recipient_id, is_read) WHERE is_read = false;

-- ============================================
-- GROUPS TABLE
-- ============================================
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  avatar_emoji TEXT DEFAULT '✝️',
  creator_id UUID NOT NULL REFERENCES users(id),
  is_private BOOLEAN DEFAULT false,
  member_count INTEGER DEFAULT 1,
  max_members INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for group search
CREATE INDEX groups_name_idx ON groups(name);
CREATE INDEX groups_creator_idx ON groups(creator_id);

-- ============================================
-- GROUP_MEMBERS TABLE
-- ============================================
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('leader', 'co-leader', 'member')),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Index for group membership lookups
CREATE INDEX group_members_group_idx ON group_members(group_id);
CREATE INDEX group_members_user_idx ON group_members(user_id);
CREATE INDEX group_members_role_idx ON group_members(role);

-- ============================================
-- GROUP_MESSAGES TABLE
-- ============================================
CREATE TABLE group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  pinned_by UUID REFERENCES users(id),
  pinned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for group chat lookups
CREATE INDEX group_messages_group_idx ON group_messages(group_id);
CREATE INDEX group_messages_sender_idx ON group_messages(sender_id);
CREATE INDEX group_messages_created_at_idx ON group_messages(created_at DESC);
CREATE INDEX group_messages_pinned_idx ON group_messages(is_pinned) WHERE is_pinned = true;

-- ============================================
-- JOIN_REQUESTS TABLE
-- ============================================
CREATE TABLE join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied')),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Index for pending join requests
CREATE INDEX join_requests_group_idx ON join_requests(group_id);
CREATE INDEX join_requests_user_idx ON join_requests(user_id);
CREATE INDEX join_requests_status_idx ON join_requests(status);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'message', 'group_invite', 'testimony_like', 'join_request')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for user notifications
CREATE INDEX notifications_user_idx ON notifications(user_id);
CREATE INDEX notifications_unread_idx ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_testimonies_updated_at BEFORE UPDATE ON testimonies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_group_messages_updated_at BEFORE UPDATE ON group_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_join_requests_updated_at BEFORE UPDATE ON join_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update location_point when lat/lng changes
CREATE OR REPLACE FUNCTION update_location_point()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
        NEW.location_point = ST_SetSRID(ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326)::geography;
    ELSE
        NEW.location_point = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_location_point BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_location_point();

-- Function to update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE groups
    SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = NEW.group_id)
    WHERE id = NEW.group_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_group_count_on_join AFTER INSERT ON group_members FOR EACH ROW EXECUTE FUNCTION update_group_member_count();
CREATE TRIGGER update_group_count_on_leave AFTER DELETE ON group_members FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users: Anyone can view profiles, only owner can edit
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = clerk_user_id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = clerk_user_id);

-- Testimonies: Public testimonies viewable by all, private only by friends
CREATE POLICY "Public testimonies viewable by everyone" ON testimonies FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create own testimony" ON testimonies FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));
CREATE POLICY "Users can update own testimony" ON testimonies FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- Messages: Only sender and recipient can view
CREATE POLICY "Users can view their messages" ON messages FOR SELECT USING (
    sender_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text) OR
    recipient_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
    sender_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);

-- Groups: Members can view, leaders can edit
CREATE POLICY "Users can view groups they're in" ON groups FOR SELECT USING (
    id IN (SELECT group_id FROM group_members WHERE user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
    OR is_private = false
);

-- Group Members: Members can view, leaders can manage
CREATE POLICY "Users can view group members" ON group_members FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
);

-- Group Messages: Only members can view
CREATE POLICY "Members can view group messages" ON group_messages FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
);
CREATE POLICY "Members can send group messages" ON group_messages FOR INSERT WITH CHECK (
    group_id IN (SELECT group_id FROM group_members WHERE user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
);

-- Notifications: Users can only view their own
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to find nearby users within radius (in miles)
CREATE OR REPLACE FUNCTION find_nearby_users(user_lat DECIMAL, user_lng DECIMAL, radius_miles INTEGER DEFAULT 25)
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    avatar_emoji TEXT,
    distance_miles DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_emoji,
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

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Lightning database schema created successfully!';
    RAISE NOTICE 'Tables created: 9';
    RAISE NOTICE 'Indexes created: 20+';
    RAISE NOTICE 'RLS policies: Enabled';
    RAISE NOTICE 'Next: Enable realtime for messages, group_messages, notifications, users';
END $$;
