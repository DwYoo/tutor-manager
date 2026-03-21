-- Add recurring lesson fields to lessons table
-- These columns support the single-record recurring lesson design:
--   is_recurring: whether this lesson repeats weekly
--   recurring_day: day of week (1=Mon ... 7=Sun)
--   recurring_end_date: last date of recurrence (exclusive), NULL = infinite
--   recurring_exceptions: array of YYYY-MM-DD dates to skip

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS recurring_day INTEGER;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS recurring_end_date TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS recurring_exceptions TEXT[] NOT NULL DEFAULT '{}';
