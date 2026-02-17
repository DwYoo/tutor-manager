-- 013: share_token RLS 보안 수정
-- 기존 정책은 share_token이 NULL이 아닌 모든 학생 데이터를 익명 사용자에게 노출함
-- 수정: 기존 public read 정책 제거 + SECURITY DEFINER 함수로 토큰 기반 단건 조회만 허용

-- 기존 정책 삭제 (002, 003 마이그레이션에서 생성된 것들)
DROP POLICY IF EXISTS "Allow public read via share_token" ON students;
DROP POLICY IF EXISTS "Allow public read lessons via shared student" ON lessons;
DROP POLICY IF EXISTS "Allow public read scores via shared student" ON scores;
DROP POLICY IF EXISTS "Allow public read reports via shared student" ON reports;
DROP POLICY IF EXISTS "Allow public read wrong_answers via shared student" ON wrong_answers;
DROP POLICY IF EXISTS "Allow public read files via shared student" ON files;
DROP POLICY IF EXISTS "Allow public read homework via shared student" ON homework;
DROP POLICY IF EXISTS "Allow public read study_plans via shared student" ON study_plans;
DROP POLICY IF EXISTS "Public read textbooks for shared students" ON textbooks;

-- SECURITY DEFINER 함수: 특정 토큰으로만 해당 학생의 전체 데이터를 반환
-- 이 함수는 RLS를 우회하여 실행되므로, 토큰이 정확히 일치하는 학생만 반환
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
  -- 토큰으로 학생 ID 조회
  SELECT id INTO v_student_id
  FROM students
  WHERE share_token = p_token;

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
