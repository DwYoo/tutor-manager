-- Create personal_events table for non-lesson calendar events
-- These appear only in weekly view with semi-transparent gray UI

CREATE TABLE IF NOT EXISTS personal_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  start_min INTEGER NOT NULL CHECK (start_min >= 0 AND start_min <= 59),
  duration INTEGER NOT NULL DEFAULT 60,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_personal_events_user_id ON personal_events(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_events_date ON personal_events(date);

-- Enable RLS
ALTER TABLE personal_events ENABLE ROW LEVEL SECURITY;

-- RLS policies scoped to user_id
CREATE POLICY "Users can read own personal_events" ON personal_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personal_events" ON personal_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal_events" ON personal_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personal_events" ON personal_events
  FOR DELETE USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE personal_events IS 'Personal calendar events (non-lesson) shown only in weekly view';
