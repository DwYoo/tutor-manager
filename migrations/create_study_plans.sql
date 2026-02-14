-- Create study_plans table
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  date TEXT NOT NULL,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_study_plans_student_id ON study_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_date ON study_plans(date);

-- Enable RLS
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies (adjust based on your auth setup)
CREATE POLICY "Enable read access for authenticated users" ON study_plans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON study_plans
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON study_plans
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON study_plans
  FOR DELETE USING (auth.role() = 'authenticated');
