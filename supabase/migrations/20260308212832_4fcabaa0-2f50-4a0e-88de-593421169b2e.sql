
-- Add speaking columns to teacher_lessons
ALTER TABLE public.teacher_lessons
  ADD COLUMN IF NOT EXISTS speaking_topic TEXT,
  ADD COLUMN IF NOT EXISTS speaking_description TEXT;

-- New table: speaking_lesson_questions (tied to teacher_lessons, not speaking_assignments)
CREATE TABLE public.speaking_lesson_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.teacher_lessons(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_speaking_lesson_questions_lesson ON public.speaking_lesson_questions(lesson_id, order_index);

ALTER TABLE public.speaking_lesson_questions ENABLE ROW LEVEL SECURITY;

-- Teachers can manage own questions
CREATE POLICY "Teachers manage own speaking lesson questions"
  ON public.speaking_lesson_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_lessons tl
      WHERE tl.id = speaking_lesson_questions.lesson_id
        AND tl.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teacher_lessons tl
      WHERE tl.id = speaking_lesson_questions.lesson_id
        AND tl.teacher_id = auth.uid()
    )
  );

-- Students can view assigned lesson questions
CREATE POLICY "Students view assigned speaking lesson questions"
  ON public.speaking_lesson_questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_lessons tl
      WHERE tl.id = speaking_lesson_questions.lesson_id
        AND (tl.student_email = get_auth_user_email() OR tl.share_token IS NOT NULL)
    )
  );

-- New table: speaking_vocabulary
CREATE TABLE public.speaking_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.speaking_lesson_questions(id) ON DELETE CASCADE,
  target_word TEXT NOT NULL,
  translation TEXT NOT NULL DEFAULT '',
  teacher_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_speaking_vocabulary_question ON public.speaking_vocabulary(question_id);

ALTER TABLE public.speaking_vocabulary ENABLE ROW LEVEL SECURITY;

-- Teachers can manage own vocabulary
CREATE POLICY "Teachers manage own speaking vocabulary"
  ON public.speaking_vocabulary
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.speaking_lesson_questions sq
      JOIN public.teacher_lessons tl ON tl.id = sq.lesson_id
      WHERE sq.id = speaking_vocabulary.question_id
        AND tl.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.speaking_lesson_questions sq
      JOIN public.teacher_lessons tl ON tl.id = sq.lesson_id
      WHERE sq.id = speaking_vocabulary.question_id
        AND tl.teacher_id = auth.uid()
    )
  );

-- Students can view vocabulary for assigned lessons
CREATE POLICY "Students view speaking vocabulary"
  ON public.speaking_vocabulary
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.speaking_lesson_questions sq
      JOIN public.teacher_lessons tl ON tl.id = sq.lesson_id
      WHERE sq.id = speaking_vocabulary.question_id
        AND (tl.student_email = get_auth_user_email() OR tl.share_token IS NOT NULL)
    )
  );
