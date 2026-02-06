-- Lightning App - Testimony Generation Rate Limiting
-- Tracks AI testimony generations to enforce server-side rate limits
-- Prevents token abuse by limiting generations per user per day

-- ============================================
-- TESTIMONY GENERATIONS LOG TABLE
-- ============================================
CREATE TABLE testimony_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_hash TEXT, -- SHA-256 hash of IP for anonymous rate limiting (no raw IPs stored)
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  input_word_count INTEGER,
  output_word_count INTEGER,
  success BOOLEAN DEFAULT true,
  error_type TEXT, -- 'profanity', 'rate_limit', 'api_error', etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast rate limit lookups
CREATE INDEX testimony_generations_user_id_created_at_idx
  ON testimony_generations(user_id, created_at DESC);
CREATE INDEX testimony_generations_ip_hash_created_at_idx
  ON testimony_generations(ip_hash, created_at DESC);
CREATE INDEX testimony_generations_created_at_idx
  ON testimony_generations(created_at DESC);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE testimony_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies — permissive (app handles authorization via Clerk)
CREATE POLICY "testimony_generations_select" ON testimony_generations FOR SELECT USING (true);
CREATE POLICY "testimony_generations_insert" ON testimony_generations FOR INSERT WITH CHECK (true);
