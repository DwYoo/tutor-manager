-- 014: study_plans RLS 정책 수정
-- 기존: auth.role() = 'authenticated' → 모든 인증 사용자가 타인의 학습계획 CRUD 가능
-- 수정: auth.uid() = user_id → 본인 데이터만 접근 가능

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON study_plans;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON study_plans;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON study_plans;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON study_plans;

CREATE POLICY "Users can read own study_plans"
  ON study_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study_plans"
  ON study_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study_plans"
  ON study_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study_plans"
  ON study_plans FOR DELETE
  USING (auth.uid() = user_id);
