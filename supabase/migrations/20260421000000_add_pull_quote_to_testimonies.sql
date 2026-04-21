-- Migration: Add pull_quote column to testimonies
-- Separates the AI-extracted God moment (pull_quote) from the user-entered lesson.
-- pull_quote: extracted from AI-generated testimony content (paragraph 3 - the God Moment)
-- lesson: user-entered manually, optional

ALTER TABLE testimonies ADD COLUMN IF NOT EXISTS pull_quote TEXT;

-- Move non-default lessons to pull_quote.
-- These rows have content a user or AI put into lesson that should be the pull quote.
UPDATE testimonies
SET pull_quote = lesson,
    lesson = NULL
WHERE lesson IS NOT NULL
  AND lesson != 'My journey taught me that transformation is possible through faith.';

-- Clear the hardcoded default lesson from all remaining rows (it was never meaningful).
UPDATE testimonies
SET lesson = NULL
WHERE lesson = 'My journey taught me that transformation is possible through faith.';
