-- wrong_answers 테이블에 resolved 컬럼 추가
-- Supabase 대시보드 > SQL Editor 에서 실행하세요
ALTER TABLE wrong_answers ADD COLUMN IF NOT EXISTS resolved boolean DEFAULT false;
