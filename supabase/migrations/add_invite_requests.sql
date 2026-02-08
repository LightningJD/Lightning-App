-- Invite approval system: members can create invites, admins approve join requests

CREATE TABLE IF NOT EXISTS server_invite_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  UNIQUE(server_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_invite_requests_server_status ON server_invite_requests(server_id, status);
CREATE INDEX IF NOT EXISTS idx_invite_requests_user ON server_invite_requests(user_id);

-- Enable RLS
ALTER TABLE server_invite_requests ENABLE ROW LEVEL SECURITY;

-- Members can view their own requests
CREATE POLICY "Users can view own invite requests"
  ON server_invite_requests FOR SELECT
  USING (user_id = auth.uid());

-- Server members can view requests for their server
CREATE POLICY "Server members can view server invite requests"
  ON server_invite_requests FOR SELECT
  USING (server_id IN (
    SELECT server_id FROM server_members WHERE user_id = auth.uid()
  ));

-- Anyone can create a request (they're joining via invite code)
CREATE POLICY "Anyone can create invite requests"
  ON server_invite_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Server members can update requests (for approve/reject)
CREATE POLICY "Server members can update invite requests"
  ON server_invite_requests FOR UPDATE
  USING (server_id IN (
    SELECT server_id FROM server_members WHERE user_id = auth.uid()
  ));
