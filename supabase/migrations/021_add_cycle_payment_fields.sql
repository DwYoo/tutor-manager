-- Add 8-session cycle payment fields to tuition table
-- period_type: 'monthly' (existing) | 'cycle' (new 8-session mode)
-- cycle_number: which cycle this record belongs to (1기, 2기, ...)
-- cycle_start_date: date of the 1st session in this cycle (YYYY-MM-DD)
-- cycle_end_date: date of the 8th session in this cycle (YYYY-MM-DD), null if incomplete

ALTER TABLE tuition
  ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS cycle_number INTEGER,
  ADD COLUMN IF NOT EXISTS cycle_start_date TEXT,
  ADD COLUMN IF NOT EXISTS cycle_end_date TEXT;

-- Existing records default to 'monthly' (handled by DEFAULT above)
-- No data migration needed
