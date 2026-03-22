
CREATE OR REPLACE FUNCTION public.bind_lesson_identity_by_share_token(p_share_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lesson RECORD;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  IF v_email IS NULL THEN RETURN; END IF;

  SELECT id, teacher_id, student_email
  INTO v_lesson
  FROM public.teacher_lessons
  WHERE share_token = p_share_token
  LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.teacher_lessons
  SET student_email = lower(trim(v_email)),
      updated_at = now()
  WHERE id = v_lesson.id;

  INSERT INTO public.teacher_students (teacher_id, student_email, status, last_active)
  VALUES (v_lesson.teacher_id, lower(trim(v_email)), 'active', now())
  ON CONFLICT (teacher_id, student_email)
  DO UPDATE SET status = 'active', last_active = now();
END;
$$;
