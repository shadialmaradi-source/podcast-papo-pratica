
-- Create lesson_responses table so students can store answers per exercise
CREATE TABLE public.lesson_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.teacher_lessons(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.lesson_exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  response TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, user_id)
);

ALTER TABLE public.lesson_responses ENABLE ROW LEVEL SECURITY;

-- Students can insert their own responses
CREATE POLICY "Students can insert own responses"
  ON public.lesson_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Students can update their own responses
CREATE POLICY "Students can update own responses"
  ON public.lesson_responses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Students can read their own responses
CREATE POLICY "Students can read own responses"
  ON public.lesson_responses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Teachers can read responses for their lessons
CREATE POLICY "Teachers can read responses for own lessons"
  ON public.lesson_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_lessons tl
      WHERE tl.id = lesson_id AND tl.teacher_id = auth.uid()
    )
  );
