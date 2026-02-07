-- ============================================
-- Migration: Announcements, Events & Custom Roles
-- Adds tables for announcement system, event/RSVP system,
-- and custom group roles.
-- ============================================

-- ============================================
-- 1. CUSTOM ROLES
-- ============================================

CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS custom_roles_group_id_idx ON custom_roles(group_id);
CREATE INDEX IF NOT EXISTS custom_roles_position_idx ON custom_roles(group_id, position);

ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_roles_select" ON custom_roles FOR SELECT USING (true);
CREATE POLICY "custom_roles_insert" ON custom_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "custom_roles_update" ON custom_roles FOR UPDATE USING (true);
CREATE POLICY "custom_roles_delete" ON custom_roles FOR DELETE USING (true);

-- Add custom_role_id to group_members if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_members' AND column_name = 'custom_role_id'
  ) THEN
    ALTER TABLE group_members ADD COLUMN custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 2. ANNOUNCEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'info' CHECK (category IN ('urgent', 'info', 'reminder', 'celebration')),
  is_pinned BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT true,
  bypass_mute BOOLEAN DEFAULT false,
  cross_group_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS announcements_group_id_idx ON announcements(group_id);
CREATE INDEX IF NOT EXISTS announcements_author_id_idx ON announcements(author_id);
CREATE INDEX IF NOT EXISTS announcements_published_idx ON announcements(group_id, is_published);
CREATE INDEX IF NOT EXISTS announcements_pinned_idx ON announcements(group_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS announcements_scheduled_idx ON announcements(scheduled_for) WHERE is_published = false;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (true);
CREATE POLICY "announcements_insert" ON announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "announcements_update" ON announcements FOR UPDATE USING (true);
CREATE POLICY "announcements_delete" ON announcements FOR DELETE USING (true);

-- Auto-update updated_at
CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. ANNOUNCEMENT RECEIPTS (read/acknowledge)
-- ============================================

CREATE TABLE IF NOT EXISTS announcement_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS announcement_receipts_announcement_idx ON announcement_receipts(announcement_id);
CREATE INDEX IF NOT EXISTS announcement_receipts_user_idx ON announcement_receipts(user_id);

ALTER TABLE announcement_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcement_receipts_select" ON announcement_receipts FOR SELECT USING (true);
CREATE POLICY "announcement_receipts_insert" ON announcement_receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "announcement_receipts_update" ON announcement_receipts FOR UPDATE USING (true);
CREATE POLICY "announcement_receipts_delete" ON announcement_receipts FOR DELETE USING (true);

-- ============================================
-- 4. EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  location_url TEXT,
  recurrence TEXT NOT NULL DEFAULT 'once' CHECK (recurrence IN ('once', 'weekly', 'biweekly', 'monthly')),
  recurrence_end_date TIMESTAMP WITH TIME ZONE,
  max_capacity INTEGER,
  reminder_24h BOOLEAN DEFAULT true,
  reminder_1h BOOLEAN DEFAULT true,
  custom_reminder_minutes INTEGER,
  parent_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  is_cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_group_id_idx ON events(group_id);
CREATE INDEX IF NOT EXISTS events_creator_id_idx ON events(creator_id);
CREATE INDEX IF NOT EXISTS events_start_time_idx ON events(start_time);
CREATE INDEX IF NOT EXISTS events_group_upcoming_idx ON events(group_id, start_time) WHERE is_cancelled = false;
CREATE INDEX IF NOT EXISTS events_parent_idx ON events(parent_event_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select" ON events FOR SELECT USING (true);
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "events_update" ON events FOR UPDATE USING (true);
CREATE POLICY "events_delete" ON events FOR DELETE USING (true);

-- Auto-update updated_at
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. EVENT RSVPs
-- ============================================

CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_rsvps_event_idx ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS event_rsvps_user_idx ON event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS event_rsvps_status_idx ON event_rsvps(event_id, status);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_rsvps_select" ON event_rsvps FOR SELECT USING (true);
CREATE POLICY "event_rsvps_insert" ON event_rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY "event_rsvps_update" ON event_rsvps FOR UPDATE USING (true);
CREATE POLICY "event_rsvps_delete" ON event_rsvps FOR DELETE USING (true);

-- Auto-update updated_at
CREATE TRIGGER event_rsvps_updated_at
  BEFORE UPDATE ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. EVENT MESSAGES (chat within events)
-- ============================================

CREATE TABLE IF NOT EXISTS event_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_messages_event_idx ON event_messages(event_id, created_at);
CREATE INDEX IF NOT EXISTS event_messages_sender_idx ON event_messages(sender_id);

ALTER TABLE event_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_messages_select" ON event_messages FOR SELECT USING (true);
CREATE POLICY "event_messages_insert" ON event_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "event_messages_delete" ON event_messages FOR DELETE USING (true);

-- ============================================
-- 7. ADD ROLE COLUMN UPDATE TO GROUP_MEMBERS
-- Update role check constraint to support new role hierarchy
-- ============================================

-- Ensure group_members role supports all role values
-- (pastor, admin, moderator, member, visitor)
-- The existing column may only have 'leader'/'member' values
DO $$
BEGIN
  -- Drop existing check constraint if any
  ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_role_check;

  -- No new constraint needed - app handles role validation
  -- Legacy 'leader' values are mapped to 'pastor' via mapLegacyRole()
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Add is_pinned, pinned_by, pinned_at to group_messages if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_messages' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE group_messages ADD COLUMN is_pinned BOOLEAN DEFAULT false;
    ALTER TABLE group_messages ADD COLUMN pinned_by UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE group_messages ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;
