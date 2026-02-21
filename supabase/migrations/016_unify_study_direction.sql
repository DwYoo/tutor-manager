-- "학습 전략" + "학습 계획" → "지도 방향" 통합
-- study_plans.title을 nullable로 변경 (지도 방향 엔트리는 제목 불필요, 날짜가 식별자)
ALTER TABLE study_plans ALTER COLUMN title DROP NOT NULL;
