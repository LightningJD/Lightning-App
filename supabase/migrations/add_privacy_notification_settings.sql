-- Add privacy and notification settings columns to users table
-- Migration created: October 24, 2025

-- Privacy Settings
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS testimony_visibility TEXT DEFAULT 'everyone' CHECK (testimony_visibility IN ('everyone', 'friends', 'private')),
ADD COLUMN IF NOT EXISTS message_privacy TEXT DEFAULT 'everyone' CHECK (message_privacy IN ('everyone', 'friends', 'none'));

-- Notification Settings
ALTER TABLE users
ADD COLUMN IF NOT EXISTS notify_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_friend_requests BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_nearby BOOLEAN DEFAULT true;

-- Comment on columns
COMMENT ON COLUMN users.is_private IS 'If true, profile is hidden from non-friends in Connect tab';
COMMENT ON COLUMN users.testimony_visibility IS 'Who can see user testimony: everyone, friends, or private';
COMMENT ON COLUMN users.message_privacy IS 'Who can send messages: everyone, friends, or none';
COMMENT ON COLUMN users.notify_messages IS 'Receive notifications for new messages';
COMMENT ON COLUMN users.notify_friend_requests IS 'Receive notifications for friend requests';
COMMENT ON COLUMN users.notify_nearby IS 'Show in nearby users / Connect tab';

-- Create blocked_users table for blocking functionality
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  UNIQUE(blocker_id, blocked_id)
);

-- Create index for efficient blocking queries
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Comment on blocked_users table
COMMENT ON TABLE blocked_users IS 'Stores user blocking relationships';

-- Create reports table for content moderation
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_testimony_id UUID,
  reported_message_id UUID,
  report_type TEXT NOT NULL CHECK (report_type IN ('user', 'testimony', 'message', 'group')),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id)
);

-- Create index for efficient report queries
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);

-- Comment on reports table
COMMENT ON TABLE reports IS 'Stores content and user reports for moderation';