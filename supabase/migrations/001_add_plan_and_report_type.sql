-- students 테이블에 학습 오버뷰(SWOT) 컬럼 추가
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_strategy text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_strength text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_weakness text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_opportunity text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_threat text;

-- reports 테이블에 type 컬럼 추가 (학습 리포트 구분용)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS type text;
