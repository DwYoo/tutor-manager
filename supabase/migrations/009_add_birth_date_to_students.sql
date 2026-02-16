-- 학생 테이블에 생년월일 컬럼 추가
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date TEXT;
