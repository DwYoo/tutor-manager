-- Add private (teacher-only) text fields for 학습전략 and SWOT
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_strategy_private text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_strength_private text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_weakness_private text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_opportunity_private text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_threat_private text;
