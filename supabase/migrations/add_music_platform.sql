-- Add music_platform field to testimonies table
-- Supports Spotify and YouTube music links

ALTER TABLE testimonies
ADD COLUMN IF NOT EXISTS music_platform VARCHAR(20) DEFAULT 'spotify' CHECK (music_platform IN ('spotify', 'youtube'));

-- Update existing rows to have 'spotify' as platform
UPDATE testimonies
SET music_platform = 'spotify'
WHERE music_platform IS NULL;

-- Add comment
COMMENT ON COLUMN testimonies.music_platform IS 'Music platform: spotify or youtube';
