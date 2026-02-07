-- ============================================
-- Church-Based Visibility & Privacy System
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Churches table
CREATE TABLE IF NOT EXISTS churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  denomination TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  member_count INT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_churches_invite_code ON churches(invite_code);

-- 2. Followers table
CREATE TABLE IF NOT EXISTS followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);

-- 3. Add church_id and profile_visibility to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'private' CHECK (profile_visibility IN ('private', 'public'));

CREATE INDEX IF NOT EXISTS idx_users_church_id ON users(church_id);

-- 4. Add visibility to testimonies
ALTER TABLE testimonies ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'my_church';

-- 5. Atomic member count functions (avoid race conditions)
CREATE OR REPLACE FUNCTION increment_member_count(church_id_input UUID)
RETURNS void AS $$
BEGIN
  UPDATE churches SET member_count = COALESCE(member_count, 0) + 1 WHERE id = church_id_input;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_member_count(church_id_input UUID)
RETURNS void AS $$
BEGIN
  UPDATE churches SET member_count = GREATEST(0, COALESCE(member_count, 1) - 1) WHERE id = church_id_input;
END;
$$ LANGUAGE plpgsql;

-- 6. RLS policies (permissive for now, enforce in app code)
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to churches" ON churches FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to followers" ON followers FOR ALL USING (true) WITH CHECK (true);
