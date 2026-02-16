-- Allow personal events (lessons without a student)
ALTER TABLE lessons ALTER COLUMN student_id DROP NOT NULL;
