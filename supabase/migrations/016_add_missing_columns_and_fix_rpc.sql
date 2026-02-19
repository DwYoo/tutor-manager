-- 016: 누락 컬럼 추가 + RPC 만료 체크 보안 수정
-- Phase 1 코드 변경에 필요한 DB 스키마 변경

-- 1. share_token_expires_at 컬럼 (공유 링크 30일 만료)
ALTER TABLE students ADD COLUMN IF NOT EXISTS share_token_expires_at TIMESTAMPTZ;

-- 2. score_goal 컬럼 (목표 점수 — 마이그레이션 누락 보정)
ALTER TABLE students ADD COLUMN IF NOT EXISTS score_goal INTEGER;

-- 3. completion_pct 컬럼 (숙제 완료율 — 마이그레이션 누락 보정)
ALTER TABLE homework ADD COLUMN IF NOT EXISTS completion_pct INTEGER DEFAULT 0;

-- 4. get_shared_student_data: 만료된 토큰 차단
CREATE OR REPLACE FUNCTION get_shared_student_data(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_student_id uuid;
  v_result json;
BEGIN
  -- 토큰 + 만료일 체크
  SELECT id INTO v_student_id
  FROM students
  WHERE share_token = p_token
    AND (share_token_expires_at IS NULL OR share_token_expires_at > now());

  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'student', (
      SELECT row_to_json(s)
      FROM students s
      WHERE s.id = v_student_id
    ),
    'lessons', COALESCE((
      SELECT json_agg(row_to_json(l) ORDER BY l.date DESC)
      FROM lessons l
      WHERE l.student_id = v_student_id
    ), '[]'::json),
    'scores', COALESCE((
      SELECT json_agg(row_to_json(sc) ORDER BY sc.created_at)
      FROM scores sc
      WHERE sc.student_id = v_student_id
    ), '[]'::json),
    'reports', COALESCE((
      SELECT json_agg(row_to_json(r) ORDER BY r.date DESC)
      FROM reports r
      WHERE r.student_id = v_student_id
    ), '[]'::json),
    'wrong_answers', COALESCE((
      SELECT json_agg(row_to_json(w) ORDER BY w.created_at DESC)
      FROM wrong_answers w
      WHERE w.student_id = v_student_id
    ), '[]'::json),
    'files', COALESCE((
      SELECT json_agg(row_to_json(f) ORDER BY f.created_at DESC)
      FROM files f
      WHERE f.student_id = v_student_id AND f.lesson_id IS NULL
    ), '[]'::json),
    'study_plans', COALESCE((
      SELECT json_agg(row_to_json(sp) ORDER BY sp.date DESC)
      FROM study_plans sp
      WHERE sp.student_id = v_student_id
    ), '[]'::json),
    'homework', COALESCE((
      SELECT json_agg(row_to_json(h))
      FROM homework h
      WHERE h.lesson_id IN (
        SELECT id FROM lessons WHERE student_id = v_student_id
      )
    ), '[]'::json),
    'textbooks', COALESCE((
      SELECT json_agg(row_to_json(t) ORDER BY t.created_at DESC)
      FROM textbooks t
      WHERE t.student_id = v_student_id
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 5. update_shared_homework: 만료된 토큰 차단
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
  -- 토큰 + 만료일 체크
  SELECT id, COALESCE(share_permissions, '{}'::jsonb)
  INTO v_student_id, v_perms
  FROM students
  WHERE share_token = p_token
    AND (share_token_expires_at IS NULL OR share_token_expires_at > now());

  IF v_student_id IS NULL THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;

  IF NOT (v_perms->>'homework_edit')::boolean THEN
    RETURN json_build_object('error', 'permission_denied');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM homework h
    JOIN lessons l ON h.lesson_id = l.id
    WHERE h.id = p_homework_id AND l.student_id = v_student_id
  ) INTO v_hw_exists;

  IF NOT v_hw_exists THEN
    RETURN json_build_object('error', 'homework_not_found');
  END IF;

  IF p_completion_pct < 0 OR p_completion_pct > 100 THEN
    RETURN json_build_object('error', 'invalid_value');
  END IF;

  UPDATE homework SET completion_pct = p_completion_pct WHERE id = p_homework_id;

  RETURN json_build_object('success', true, 'completion_pct', p_completion_pct);
END;
$$;

GRANT EXECUTE ON FUNCTION get_shared_student_data(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_shared_student_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_shared_homework(uuid, uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION update_shared_homework(uuid, uuid, integer) TO authenticated;
