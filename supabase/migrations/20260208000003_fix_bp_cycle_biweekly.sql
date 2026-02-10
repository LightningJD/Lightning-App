-- Fix BP cycle to biweekly (every 2 weeks) on Sundays at 7:30 PM PST
-- First cycle: now → Sunday March 8, 2026 at 7:30 PM PST (March 9 03:30 UTC)
-- This gives ~2 weeks from the start date

-- Delete old cycles and start fresh
DELETE FROM bp_cycles
WHERE 1 = 1;

-- Create first biweekly cycle
INSERT INTO bp_cycles (cycle_start, cycle_end, is_current)
VALUES (
  NOW(),
  '2026-03-09T03:30:00+00:00',  -- March 8 7:30 PM PST = March 9 03:30 UTC
  true
);
