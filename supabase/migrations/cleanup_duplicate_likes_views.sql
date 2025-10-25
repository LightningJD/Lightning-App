-- ============================================
-- CLEANUP DUPLICATE LIKES AND VIEWS
-- ============================================
-- This script removes duplicate records from testimony_likes and testimony_views
-- that violate the UNIQUE constraints.

-- ============================================
-- FIX DUPLICATE TESTIMONY LIKES
-- ============================================
-- Keep only the oldest like for each (testimony_id, user_id) pair

-- First, let's see how many duplicates exist
SELECT
  testimony_id,
  user_id,
  COUNT(*) as duplicate_count
FROM testimony_likes
GROUP BY testimony_id, user_id
HAVING COUNT(*) > 1;

-- Delete duplicates, keeping only the oldest (earliest created_at)
DELETE FROM testimony_likes
WHERE id NOT IN (
  SELECT MIN(id)
  FROM testimony_likes
  GROUP BY testimony_id, user_id
);

-- ============================================
-- FIX DUPLICATE TESTIMONY VIEWS
-- ============================================
-- Keep only the oldest view for each (testimony_id, viewer_id) pair

-- First, let's see how many duplicates exist
SELECT
  testimony_id,
  viewer_id,
  COUNT(*) as duplicate_count
FROM testimony_views
GROUP BY testimony_id, viewer_id
HAVING COUNT(*) > 1;

-- Delete duplicates, keeping only the oldest (earliest viewed_at)
DELETE FROM testimony_views
WHERE id NOT IN (
  SELECT MIN(id)
  FROM testimony_views
  GROUP BY testimony_id, viewer_id
);

-- ============================================
-- VERIFY CLEANUP
-- ============================================
-- Should return 0 rows if cleanup was successful
SELECT 'testimony_likes duplicates remaining:' as check_type, COUNT(*) as count
FROM (
  SELECT testimony_id, user_id
  FROM testimony_likes
  GROUP BY testimony_id, user_id
  HAVING COUNT(*) > 1
) as duplicates

UNION ALL

SELECT 'testimony_views duplicates remaining:' as check_type, COUNT(*) as count
FROM (
  SELECT testimony_id, viewer_id
  FROM testimony_views
  GROUP BY testimony_id, viewer_id
  HAVING COUNT(*) > 1
) as duplicates;

-- ============================================
-- RESULT
-- ============================================
-- After running this script:
-- - All duplicate likes removed
-- - All duplicate views removed
-- - UNIQUE constraints will now work properly
-- - The 406 error should disappear
-- - The 409 error on views is expected (duplicate insert attempts)
