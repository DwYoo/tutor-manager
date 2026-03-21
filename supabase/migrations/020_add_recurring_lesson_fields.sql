-- Add recurring lesson fields to lessons table
-- These columns support BOTH the legacy single-record design AND the new
-- per-occurrence design where each weekly instance is its own DB row.
--
-- Legacy columns (single-record design):
--   is_recurring: whether this record represents a whole recurring series
--   recurring_day: day of week (1=Mon ... 7=Sun)
--   recurring_end_date: end of series (exclusive), NULL = infinite
--   recurring_exceptions: array of YYYY-MM-DD dates to skip
--
-- New column (per-occurrence design):
--   recurring_series_id: UUID shared by all lessons in the same recurring series.
--     NULL for one-off lessons and legacy series records.
--     When set, each lesson in the series has its own row with a concrete date.

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS recurring_day INTEGER;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS recurring_end_date TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS recurring_exceptions TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS recurring_series_id UUID;

-- Index for fast series lookups (delete/edit all in series)
CREATE INDEX IF NOT EXISTS lessons_recurring_series_id_idx ON lessons(recurring_series_id) WHERE recurring_series_id IS NOT NULL;
