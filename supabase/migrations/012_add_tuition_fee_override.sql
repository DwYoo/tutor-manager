-- 수업료(tuition fee)와 청구액(total due)을 독립적으로 수동 관리하기 위한 컬럼
-- 기존 fee_override/fee_manual은 청구액 수동 관리용으로 유지
-- tuition_fee_override는 수업료 수동 관리용 (null이면 자동 = fee_per_class × 횟수)
ALTER TABLE tuition ADD COLUMN IF NOT EXISTS tuition_fee_override INTEGER DEFAULT NULL;
