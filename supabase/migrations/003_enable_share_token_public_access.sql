-- 공유 링크를 통한 비로그인 사용자(anon)의 읽기 접근 허용
-- share_token이 존재하는 학생의 데이터만 공개 조회 가능

-- students: share_token으로 공개 조회 허용
CREATE POLICY "Allow public read via share_token"
  ON students FOR SELECT
  USING (share_token IS NOT NULL);

-- lessons: 공유된 학생의 수업 데이터 조회 허용
CREATE POLICY "Allow public read lessons via shared student"
  ON lessons FOR SELECT
  USING (student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL));

-- scores: 공유된 학생의 성적 데이터 조회 허용
CREATE POLICY "Allow public read scores via shared student"
  ON scores FOR SELECT
  USING (student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL));

-- reports: 공유된 학생의 리포트 조회 허용
CREATE POLICY "Allow public read reports via shared student"
  ON reports FOR SELECT
  USING (student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL));

-- wrong_answers: 공유된 학생의 오답 데이터 조회 허용
CREATE POLICY "Allow public read wrong_answers via shared student"
  ON wrong_answers FOR SELECT
  USING (student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL));

-- files: 공유된 학생의 파일 조회 허용
CREATE POLICY "Allow public read files via shared student"
  ON files FOR SELECT
  USING (student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL));

-- homework: 공유된 학생의 숙제 조회 허용
CREATE POLICY "Allow public read homework via shared student"
  ON homework FOR SELECT
  USING (lesson_id IN (SELECT id FROM lessons WHERE student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL)));

-- study_plans: 공유된 학생의 학습 계획 조회 허용
-- study_plans 테이블은 별도 RLS가 활성화되어 있으므로 반드시 추가 필요
CREATE POLICY "Allow public read study_plans via shared student"
  ON study_plans FOR SELECT
  USING (student_id IN (SELECT id FROM students WHERE share_token IS NOT NULL));
