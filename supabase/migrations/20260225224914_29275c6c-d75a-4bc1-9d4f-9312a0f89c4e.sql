
-- 1. Helper function to safely get current user's email
CREATE OR REPLACE FUNCTION public.get_auth_user_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

-- 2. Fix teacher_lessons student policy
DROP POLICY IF EXISTS "Students can view assigned lessons" ON public.teacher_lessons;
CREATE POLICY "Students can view assigned lessons"
  ON public.teacher_lessons FOR SELECT
  USING (student_email = public.get_auth_user_email());

-- 3. Fix lesson_exercises student policy
DROP POLICY IF EXISTS "Students can view assigned lesson exercises" ON public.lesson_exercises;
CREATE POLICY "Students can view assigned lesson exercises"
  ON public.lesson_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM teacher_lessons tl
    WHERE tl.id = lesson_exercises.lesson_id
      AND tl.student_email = public.get_auth_user_email()
  ));
