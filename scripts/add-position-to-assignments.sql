-- Add position column to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS position VARCHAR(100);

-- Update the column comment
COMMENT ON COLUMN assignments.position IS 'Guard position at site: Gate, Patrol, Control Room, etc.';
