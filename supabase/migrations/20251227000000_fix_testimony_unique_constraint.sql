-- Fix for testimony save error 42P10
-- Add unique constraint to testimonies(user_id) to allow upsert to work correctly

-- Delete duplicates if any exist (keeping the most recently updated one)
DELETE FROM testimonies
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rnum
    FROM testimonies
  ) t
  WHERE t.rnum > 1
);

-- Add the unique constraint
ALTER TABLE testimonies ADD CONSTRAINT testimonies_user_id_key UNIQUE (user_id);
