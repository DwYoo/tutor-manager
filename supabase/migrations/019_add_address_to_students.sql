-- Add address field to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
