-- Add subject and chapters columns to existing textbooks table
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '';
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS chapters JSONB DEFAULT '[]'::jsonb;
