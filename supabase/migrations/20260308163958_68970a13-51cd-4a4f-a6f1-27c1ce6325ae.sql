
-- speaking_assignments table
CREATE TABLE public.speaking_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_email text NOT NULL,
  topic_title text NOT NULL,
  topic_description text,
  cefr_level text NOT NULL DEFAULT 'A1',
  language text NOT NULL DEFAULT 'italian',
  custom_instructions text,
  due_date date,
  status text NOT NULL DEFAULT 'assigned',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.speaking_assignments ENABLE ROW LEVEL SECURITY;

-- Teacher policies
CREATE POLICY "Teachers can insert own speaking assignments"
  ON public.speaking_assignments FOR INSERT
  WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can select own speaking assignments"
  ON public.speaking_assignments FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own speaking assignments"
  ON public.speaking_assignments FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own speaking assignments"
  ON public.speaking_assignments FOR DELETE
  USING (auth.uid() = teacher_id);

-- Student policies
CREATE POLICY "Students can view own speaking assignments"
  ON public.speaking_assignments FOR SELECT
  USING (student_email = get_auth_user_email());

CREATE POLICY "Students can update own speaking assignments"
  ON public.speaking_assignments FOR UPDATE
  USING (student_email = get_auth_user_email());

-- speaking_questions table
CREATE TABLE public.speaking_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.speaking_assignments(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  difficulty integer NOT NULL DEFAULT 1,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.speaking_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage speaking questions"
  ON public.speaking_questions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.speaking_assignments sa
    WHERE sa.id = speaking_questions.assignment_id AND sa.teacher_id = auth.uid()
  ));

CREATE POLICY "Students can view speaking questions"
  ON public.speaking_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.speaking_assignments sa
    WHERE sa.id = speaking_questions.assignment_id AND sa.student_email = get_auth_user_email()
  ));

-- speaking_responses table
CREATE TABLE public.speaking_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.speaking_assignments(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.speaking_questions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  response_type text NOT NULL DEFAULT 'text',
  response_text text,
  is_prepared boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(question_id, student_id)
);

ALTER TABLE public.speaking_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own speaking responses"
  ON public.speaking_responses FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own speaking responses"
  ON public.speaking_responses FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can update own speaking responses"
  ON public.speaking_responses FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view speaking responses"
  ON public.speaking_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.speaking_assignments sa
    WHERE sa.id = speaking_responses.assignment_id AND sa.teacher_id = auth.uid()
  ));
