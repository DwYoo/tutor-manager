-- students 테이블에 공유 토큰 컬럼 추가
ALTER TABLE students ADD COLUMN IF NOT EXISTS share_token uuid UNIQUE;

-- share_token으로 조회할 수 있도록 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_students_share_token ON students(share_token) WHERE share_token IS NOT NULL;

-- RLS가 활성화된 경우: share_token으로 공개 조회 허용
-- 이 정책들은 003_enable_share_token_public_access.sql에서 적용됩니다
CREATE POLICY "Allow public read via share_token" ON students FOR SELECT USING (share_token IS NOT NULL);
CREATE POLICY "Allow public read lessons via shared student" ON lessons FOR SELECT USING (student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL));
CREATE POLICY "Allow public read scores via shared student" ON scores FOR SELECT USING (student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL));
CREATE POLICY "Allow public read reports via shared student" ON reports FOR SELECT USING (student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL));
CREATE POLICY "Allow public read wrong_answers via shared student" ON wrong_answers FOR SELECT USING (student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL));
CREATE POLICY "Allow public read files via shared student" ON files FOR SELECT USING (student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL));
CREATE POLICY "Allow public read homework via shared student" ON homework FOR SELECT USING (lesson_id IN (SELECT id FROM lessons WHERE student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL)));
