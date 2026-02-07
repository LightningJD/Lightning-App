-- Add profile card fields for Pokédex-style testimony directory cards
-- These fields power the V15+V11 combined profile card design

-- Church information
ALTER TABLE users ADD COLUMN IF NOT EXISTS church_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS church_location TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS denomination TEXT;

-- Faith journey
ALTER TABLE users ADD COLUMN IF NOT EXISTS year_saved INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_baptized BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS year_baptized INTEGER;

-- Favorite scripture
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_verse TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_verse_ref TEXT; -- e.g. "Jeremiah 29:11"

-- Faith interest tags (stored as JSON array of strings)
ALTER TABLE users ADD COLUMN IF NOT EXISTS faith_interests TEXT[] DEFAULT '{}';

-- Entry number for Pokédex-style directory (auto-incrementing based on user order)
-- We'll use row_number based on created_at for now
ALTER TABLE users ADD COLUMN IF NOT EXISTS entry_number INTEGER;

-- Set entry numbers for existing users based on creation order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM users
)
UPDATE users SET entry_number = numbered.rn
FROM numbered WHERE users.id = numbered.id AND users.entry_number IS NULL;

-- Create a function to auto-assign entry numbers to new users
CREATE OR REPLACE FUNCTION assign_entry_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entry_number IS NULL THEN
    NEW.entry_number := COALESCE((SELECT MAX(entry_number) FROM users), 0) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_assign_entry_number ON users;
CREATE TRIGGER trigger_assign_entry_number
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION assign_entry_number();
