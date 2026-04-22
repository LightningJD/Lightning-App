-- Lightning Migration: Add 7 Color Badge columns to testimonies
-- Part of the 14 Doors of Deliverance feature
-- Safe: adds columns only, no data loss

-- Badge color assigned by AI (one of 7 rainbow colors)
ALTER TABLE testimonies
  ADD COLUMN IF NOT EXISTS badge_color TEXT
  CHECK (badge_color IN ('red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'));

-- Door number assigned by AI (1-14)
ALTER TABLE testimonies
  ADD COLUMN IF NOT EXISTS badge_door INTEGER
  CHECK (badge_door >= 1 AND badge_door <= 14);

-- Index for filtering/querying testimonies by badge color
CREATE INDEX IF NOT EXISTS testimonies_badge_color_idx ON testimonies(badge_color);

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'testimonies'
  AND column_name IN ('badge_color', 'badge_door')
ORDER BY column_name;
