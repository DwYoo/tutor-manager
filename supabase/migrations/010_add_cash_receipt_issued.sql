-- tuition 테이블에 현금영수증 발행 여부 컬럼 추가
ALTER TABLE tuition ADD COLUMN IF NOT EXISTS cash_receipt_issued BOOLEAN DEFAULT FALSE;
