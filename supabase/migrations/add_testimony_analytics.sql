-- Add testimony analytics tables for tracking views, likes, and comments
-- This enables the final 3 secrets: Viral Testimony, Heart Toucher, Conversation Starter

-- ============================================
-- TESTIMONY VIEWS TABLE
-- ============================================
-- Track unique views per testimony (one row per user per testimony)
CREATE TABLE IF NOT EXISTS testimony_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  testimony_id UUID NOT NULL REFERENCES testimonies(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(testimony_id, viewer_id) -- One view per user per testimony
);

-- Index for fast testimony view lookups
CREATE INDEX IF NOT EXISTS testimony_views_testimony_id_idx ON testimony_views(testimony_id);
CREATE INDEX IF NOT EXISTS testimony_views_viewer_id_idx ON testimony_views(viewer_id);

-- ============================================
-- TESTIMONY LIKES/HEARTS TABLE
-- ============================================
-- Track who liked which testimony
CREATE TABLE IF NOT EXISTS testimony_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  testimony_id UUID NOT NULL REFERENCES testimonies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(testimony_id, user_id) -- One like per user per testimony
);

-- Index for fast testimony like lookups
CREATE INDEX IF NOT EXISTS testimony_likes_testimony_id_idx ON testimony_likes(testimony_id);
CREATE INDEX IF NOT EXISTS testimony_likes_user_id_idx ON testimony_likes(user_id);

-- ============================================
-- TESTIMONY COMMENTS TABLE
-- ============================================
-- Comments on testimonies
CREATE TABLE IF NOT EXISTS testimony_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  testimony_id UUID NOT NULL REFERENCES testimonies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast testimony comment lookups
CREATE INDEX IF NOT EXISTS testimony_comments_testimony_id_idx ON testimony_comments(testimony_id);
CREATE INDEX IF NOT EXISTS testimony_comments_user_id_idx ON testimony_comments(user_id);
CREATE INDEX IF NOT EXISTS testimony_comments_created_at_idx ON testimony_comments(created_at DESC);

-- ============================================
-- FUNCTIONS TO UPDATE COUNTS
-- ============================================

-- Function to update testimony view count
CREATE OR REPLACE FUNCTION update_testimony_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE testimonies
  SET view_count = (
    SELECT COUNT(*) FROM testimony_views WHERE testimony_id = NEW.testimony_id
  )
  WHERE id = NEW.testimony_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update view count when new view is added
DROP TRIGGER IF EXISTS update_testimony_view_count_trigger ON testimony_views;
CREATE TRIGGER update_testimony_view_count_trigger
AFTER INSERT ON testimony_views
FOR EACH ROW
EXECUTE FUNCTION update_testimony_view_count();

-- Function to update testimony like count
CREATE OR REPLACE FUNCTION update_testimony_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE testimonies
    SET like_count = (
      SELECT COUNT(*) FROM testimony_likes WHERE testimony_id = NEW.testimony_id
    )
    WHERE id = NEW.testimony_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE testimonies
    SET like_count = (
      SELECT COUNT(*) FROM testimony_likes WHERE testimony_id = OLD.testimony_id
    )
    WHERE id = OLD.testimony_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update like count when likes are added/removed
DROP TRIGGER IF EXISTS update_testimony_like_count_trigger ON testimony_likes;
CREATE TRIGGER update_testimony_like_count_trigger
AFTER INSERT OR DELETE ON testimony_likes
FOR EACH ROW
EXECUTE FUNCTION update_testimony_like_count();
