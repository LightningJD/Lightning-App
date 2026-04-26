-- Voice recording feature: transcription logging table
-- Tracks STT usage for rate limiting and analytics
-- Service-role-only access (no RLS policies needed)

CREATE TABLE IF NOT EXISTS transcription_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),     -- nullable for guests
  ip_hash     TEXT NOT NULL,
  question_id TEXT,
  duration_sec INT,
  char_count  INT,
  model       TEXT,
  success     BOOLEAN NOT NULL,
  error_type  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transcription_attempts_user_window
  ON transcription_attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS transcription_attempts_ip_window
  ON transcription_attempts (ip_hash, created_at DESC);
