-- 023: get_shared_student_data 함수에 토큰 만료 체크 추가
-- share_token_expires_at이 현재 시각보다 이전이면 유효하지 않은 토큰으로 처리

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
  -- 토큰으로 학생 ID 조회 (만료 여부 함께 확인)
  SELECT id INTO v_student_id
  FROM students
  WHERE share_token = p_token
    AND (share_token_expires_at IS NULL OR share_token_expires_at > NOW());

  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 해당 학생의 모든 공유 데이터를 JSON으로 반환
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

-- anon 사용자가 이 함수를 호출할 수 있도록 권한 부여
GRANT EXECUTE ON FUNCTION get_shared_student_data(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_shared_student_data(uuid) TO authenticated;
