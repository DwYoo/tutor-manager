-- Add private memo field for SWOT/strategy section (teacher-only, not shared with parents)
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_private_memo TEXT;
