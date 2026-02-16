-- Fix RLS policies to scope by user_id instead of just authenticated role
-- This prevents users from accessing each other's data

-- Drop existing broad policies on study_plans
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON study_plans;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON study_plans;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON study_plans;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON study_plans;

-- Create proper user-scoped policies for study_plans
CREATE POLICY "Users can read own study_plans" ON study_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study_plans" ON study_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study_plans" ON study_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study_plans" ON study_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Fix RLS policies for all other tables
-- Students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own students" ON students;
DROP POLICY IF EXISTS "Users can insert own students" ON students;
DROP POLICY IF EXISTS "Users can update own students" ON students;
DROP POLICY IF EXISTS "Users can delete own students" ON students;

CREATE POLICY "Users can read own students" ON students
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own students" ON students
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own students" ON students
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own students" ON students
  FOR DELETE USING (auth.uid() = user_id);

-- Lessons table
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own lessons" ON lessons;
DROP POLICY IF EXISTS "Users can insert own lessons" ON lessons;
DROP POLICY IF EXISTS "Users can update own lessons" ON lessons;
DROP POLICY IF EXISTS "Users can delete own lessons" ON lessons;

CREATE POLICY "Users can read own lessons" ON lessons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lessons" ON lessons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lessons" ON lessons
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lessons" ON lessons
  FOR DELETE USING (auth.uid() = user_id);

-- Homework table
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own homework" ON homework;
DROP POLICY IF EXISTS "Users can insert own homework" ON homework;
DROP POLICY IF EXISTS "Users can update own homework" ON homework;
DROP POLICY IF EXISTS "Users can delete own homework" ON homework;

CREATE POLICY "Users can read own homework" ON homework
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = homework.lesson_id
      AND lessons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own homework" ON homework
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = homework.lesson_id
      AND lessons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own homework" ON homework
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = homework.lesson_id
      AND lessons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own homework" ON homework
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = homework.lesson_id
      AND lessons.user_id = auth.uid()
    )
  );

-- Tuition table
ALTER TABLE tuition ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own tuition" ON tuition;
DROP POLICY IF EXISTS "Users can insert own tuition" ON tuition;
DROP POLICY IF EXISTS "Users can update own tuition" ON tuition;
DROP POLICY IF EXISTS "Users can delete own tuition" ON tuition;

CREATE POLICY "Users can read own tuition" ON tuition
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tuition" ON tuition
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tuition" ON tuition
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tuition" ON tuition
  FOR DELETE USING (auth.uid() = user_id);

-- Scores table
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own scores" ON scores;
DROP POLICY IF EXISTS "Users can insert own scores" ON scores;
DROP POLICY IF EXISTS "Users can update own scores" ON scores;
DROP POLICY IF EXISTS "Users can delete own scores" ON scores;

CREATE POLICY "Users can read own scores" ON scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scores" ON scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scores" ON scores
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scores" ON scores
  FOR DELETE USING (auth.uid() = user_id);

-- Wrong answers table
ALTER TABLE wrong_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own wrong_answers" ON wrong_answers;
DROP POLICY IF EXISTS "Users can insert own wrong_answers" ON wrong_answers;
DROP POLICY IF EXISTS "Users can update own wrong_answers" ON wrong_answers;
DROP POLICY IF EXISTS "Users can delete own wrong_answers" ON wrong_answers;

CREATE POLICY "Users can read own wrong_answers" ON wrong_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wrong_answers" ON wrong_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wrong_answers" ON wrong_answers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wrong_answers" ON wrong_answers
  FOR DELETE USING (auth.uid() = user_id);

-- Reports table
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own reports" ON reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON reports;
DROP POLICY IF EXISTS "Users can update own reports" ON reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON reports;

CREATE POLICY "Users can read own reports" ON reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports" ON reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports" ON reports
  FOR DELETE USING (auth.uid() = user_id);

-- Files table
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own files" ON files;
DROP POLICY IF EXISTS "Users can insert own files" ON files;
DROP POLICY IF EXISTS "Users can update own files" ON files;
DROP POLICY IF EXISTS "Users can delete own files" ON files;

CREATE POLICY "Users can read own files" ON files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files" ON files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files" ON files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files" ON files
  FOR DELETE USING (auth.uid() = user_id);

-- Textbooks table
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own textbooks" ON textbooks;
DROP POLICY IF EXISTS "Users can insert own textbooks" ON textbooks;
DROP POLICY IF EXISTS "Users can update own textbooks" ON textbooks;
DROP POLICY IF EXISTS "Users can delete own textbooks" ON textbooks;

CREATE POLICY "Users can read own textbooks" ON textbooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own textbooks" ON textbooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own textbooks" ON textbooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own textbooks" ON textbooks
  FOR DELETE USING (auth.uid() = user_id);
