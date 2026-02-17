
-- Teacher lessons table
CREATE TABLE public.teacher_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  student_email text,
  topic text,
  cefr_level text NOT NULL DEFAULT 'A1',
  exercise_types text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_lessons ENABLE ROW LEVEL SECURITY;

-- Teachers can CRUD their own lessons
CREATE POLICY "Teachers can view own lessons"
  ON public.teacher_lessons FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create lessons"
  ON public.teacher_lessons FOR INSERT
  WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update own lessons"
  ON public.teacher_lessons FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own lessons"
  ON public.teacher_lessons FOR DELETE
  USING (auth.uid() = teacher_id);

-- Students can view lessons assigned to them (by email match)
CREATE POLICY "Students can view assigned lessons"
  ON public.teacher_lessons FOR SELECT
  USING (student_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Lesson exercises table
CREATE TABLE public.lesson_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.teacher_lessons(id) ON DELETE CASCADE,
  exercise_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_exercises ENABLE ROW LEVEL SECURITY;

-- Teachers see exercises for their lessons
CREATE POLICY "Teachers can view own lesson exercises"
  ON public.lesson_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.teacher_lessons tl
    WHERE tl.id = lesson_exercises.lesson_id AND tl.teacher_id = auth.uid()
  ));

CREATE POLICY "Teachers can insert exercises"
  ON public.lesson_exercises FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.teacher_lessons tl
    WHERE tl.id = lesson_exercises.lesson_id AND tl.teacher_id = auth.uid()
  ));

CREATE POLICY "Teachers can update own exercises"
  ON public.lesson_exercises FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.teacher_lessons tl
    WHERE tl.id = lesson_exercises.lesson_id AND tl.teacher_id = auth.uid()
  ));

CREATE POLICY "Teachers can delete own exercises"
  ON public.lesson_exercises FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.teacher_lessons tl
    WHERE tl.id = lesson_exercises.lesson_id AND tl.teacher_id = auth.uid()
  ));

-- Students can view exercises for their assigned lessons
CREATE POLICY "Students can view assigned lesson exercises"
  ON public.lesson_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.teacher_lessons tl
    WHERE tl.id = lesson_exercises.lesson_id
      AND tl.student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ));

-- Trigger for updated_at on teacher_lessons
CREATE TRIGGER update_teacher_lessons_updated_at
  BEFORE UPDATE ON public.teacher_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
