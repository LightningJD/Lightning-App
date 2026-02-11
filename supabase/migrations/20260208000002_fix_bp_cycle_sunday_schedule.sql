-- Fix BP cycle to reset every Sunday at 7:30 PM PST (03:30 UTC Monday)
-- First cycle ends Sunday Feb 23, 2026 at 7:30 PM PST

-- Delete the old auto-generated cycle
DELETE FROM bp_cycles
WHERE 1 = 1;

-- Create the first proper cycle: now → Sunday Feb 23 7:30 PM PST
INSERT INTO bp_cycles (cycle_start, cycle_end, is_current)
VALUES (
  NOW(),
  '2026-02-24T03:30:00+00:00',  -- Feb 23 7:30 PM PST = Feb 24 03:30 UTC
  true
);
