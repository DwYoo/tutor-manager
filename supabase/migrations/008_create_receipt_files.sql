-- receipt_files: 영수증 PDF 등 파일 메타데이터
CREATE TABLE IF NOT EXISTS receipt_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  month VARCHAR(7) NOT NULL,  -- 'YYYY-MM'
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,    -- storage path
  file_size BIGINT DEFAULT 0,
  mime_type TEXT DEFAULT 'application/pdf',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE receipt_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own receipt files"
  ON receipt_files FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket (Supabase storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can manage their own folder
CREATE POLICY "Users can upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
