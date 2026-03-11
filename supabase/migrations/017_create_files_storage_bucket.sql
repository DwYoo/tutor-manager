-- Create 'files' storage bucket for student resources (자료실)
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload files under students/ folder
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'files' AND auth.role() = 'authenticated');

-- Storage RLS: anyone can view files (public bucket for sharing)
CREATE POLICY "Public read access for files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'files');

-- Storage RLS: authenticated users can delete their own files
CREATE POLICY "Authenticated users can delete files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'files' AND auth.role() = 'authenticated');
