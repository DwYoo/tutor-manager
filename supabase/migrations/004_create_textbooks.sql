-- Create textbooks table for managing student textbooks
CREATE TABLE IF NOT EXISTS textbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  publisher TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their own textbooks
CREATE POLICY "Auth users manage own textbooks" ON textbooks
  FOR ALL USING (auth.uid() = user_id);

-- Public read access for shared students (parent view)
CREATE POLICY "Public read textbooks for shared students" ON textbooks
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL)
  );
