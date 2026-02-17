-- 015: 공유 링크 기능별 권한 설정
-- share_permissions JSONB 컬럼으로 기능별 세밀한 권한 제어
-- 기본값: 읽기 전용 (모든 권한 false)

ALTER TABLE students ADD COLUMN IF NOT EXISTS share_permissions jsonb
  DEFAULT '{"homework_edit": false, "homework_view": true, "scores_view": true, "lessons_view": true, "wrong_view": true, "files_view": true, "reports_view": true, "plans_view": true}'::jsonb;

-- get_shared_student_data를 업데이트하여 share_permissions도 반환
-- (student 객체에 자동 포함되므로 별도 변경 불필요)

-- 숙제 완료도를 공유 링크에서 업데이트하는 SECURITY DEFINER 함수
CREATE OR REPLACE FUNCTION update_shared_homework(
  p_token uuid,
  p_homework_id uuid,
  p_completion_pct integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id uuid;
  v_perms jsonb;
  v_hw_exists boolean;
BEGIN
  -- 토큰으로 학생 및 권한 조회
  SELECT id, COALESCE(share_permissions, '{}'::jsonb)
  INTO v_student_id, v_perms
  FROM students
  WHERE share_token = p_token;

  IF v_student_id IS NULL THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;

  -- homework_edit 권한 확인
  IF NOT (v_perms->>'homework_edit')::boolean THEN
    RETURN json_build_object('error', 'permission_denied');
  END IF;

  -- 해당 숙제가 이 학생의 수업에 속하는지 확인
  SELECT EXISTS(
    SELECT 1 FROM homework h
    JOIN lessons l ON h.lesson_id = l.id
    WHERE h.id = p_homework_id AND l.student_id = v_student_id
  ) INTO v_hw_exists;

  IF NOT v_hw_exists THEN
    RETURN json_build_object('error', 'homework_not_found');
  END IF;

  -- completion_pct 범위 제한 (0~100)
  IF p_completion_pct < 0 OR p_completion_pct > 100 THEN
    RETURN json_build_object('error', 'invalid_value');
  END IF;

  -- 업데이트
  UPDATE homework SET completion_pct = p_completion_pct WHERE id = p_homework_id;

  RETURN json_build_object('success', true, 'completion_pct', p_completion_pct);
END;
$$;

GRANT EXECUTE ON FUNCTION update_shared_homework(uuid, uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION update_shared_homework(uuid, uuid, integer) TO authenticated;
