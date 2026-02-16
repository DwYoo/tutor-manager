-- tuition 테이블에 수업횟수 override, 수동 청구액 모드 컬럼 추가
ALTER TABLE tuition ADD COLUMN IF NOT EXISTS classes_override INTEGER;
ALTER TABLE tuition ADD COLUMN IF NOT EXISTS fee_manual BOOLEAN DEFAULT FALSE;
