-- Add music start time column to testimonies table
-- This allows users to set a custom start time for their testimony music
-- Time is stored in seconds (e.g., 192 seconds = 3:12)

ALTER TABLE testimonies
ADD COLUMN IF NOT EXISTS music_start_time INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN testimonies.music_start_time IS 'Music start time in seconds (e.g., 192 = 3:12)';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'testimonies'
AND column_name = 'music_start_time';
