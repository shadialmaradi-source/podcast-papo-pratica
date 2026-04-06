-- Bind shared teacher lesson to the authenticated student's real email identity.
-- This keeps teacher_lessons.student_email and teacher_students records consistent
-- after auth handoff from a shared lesson link.

CREATE OR REPLACE FUNCTION public.bind_lesson_identity_by_share_token(p_share_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lesson_id uuid;
  v_teacher_id uuid;
  v_auth_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_share_token IS NULL OR length(trim(p_share_token)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT id, teacher_id
    INTO v_lesson_id, v_teacher_id
  FROM public.teacher_lessons
  WHERE share_token = p_share_token
  LIMIT 1;

  IF v_lesson_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_auth_email := lower(public.get_auth_user_email());

  IF v_auth_email IS NULL OR length(trim(v_auth_email)) = 0 THEN
    RAISE EXCEPTION 'AUTH_EMAIL_NOT_FOUND';
  END IF;

  UPDATE public.teacher_lessons
  SET student_email = v_auth_email
  WHERE id = v_lesson_id;

  INSERT INTO public.teacher_students (teacher_id, student_email, status, last_active)
  VALUES (v_teacher_id, v_auth_email, 'active', now())
  ON CONFLICT (teacher_id, student_email)
  DO UPDATE SET
    status = 'active',
    last_active = now();

  RETURN v_lesson_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bind_lesson_identity_by_share_token(text) TO authenticated;
