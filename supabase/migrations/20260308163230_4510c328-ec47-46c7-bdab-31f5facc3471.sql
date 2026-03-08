
-- Create video_assignments table
CREATE TABLE public.video_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_email text NOT NULL,
  assignment_type text NOT NULL DEFAULT 'video',
  video_id text,
  video_title text,
  speaking_topic text,
  speaking_level text,
  due_date date,
  note text,
  status text NOT NULL DEFAULT 'assigned',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Create speaking_topics table
CREATE TABLE public.speaking_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  cefr_level text NOT NULL,
  language text NOT NULL DEFAULT 'italian',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaking_topics ENABLE ROW LEVEL SECURITY;

-- RLS for video_assignments: Teachers full access on own rows
CREATE POLICY "Teachers can insert own assignments"
  ON public.video_assignments FOR INSERT
  WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can select own assignments"
  ON public.video_assignments FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own assignments"
  ON public.video_assignments FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own assignments"
  ON public.video_assignments FOR DELETE
  USING (auth.uid() = teacher_id);

-- Students can view their own assignments
CREATE POLICY "Students can view assigned assignments"
  ON public.video_assignments FOR SELECT
  USING (student_email = get_auth_user_email());

-- Students can update own assignments (mark completed)
CREATE POLICY "Students can update own assignments"
  ON public.video_assignments FOR UPDATE
  USING (student_email = get_auth_user_email());

-- RLS for speaking_topics: all authenticated can read
CREATE POLICY "Authenticated can view speaking topics"
  ON public.speaking_topics FOR SELECT
  USING (auth.role() = 'authenticated');

-- Seed speaking topics for Italian
INSERT INTO public.speaking_topics (topic, cefr_level, language) VALUES
  ('Describe your daily morning routine', 'A1', 'italian'),
  ('Talk about your family members', 'A1', 'italian'),
  ('Describe the weather today', 'A1', 'italian'),
  ('Talk about your favorite food', 'A1', 'italian'),
  ('Describe your house or apartment', 'A1', 'italian'),
  ('Talk about what you did last weekend', 'A2', 'italian'),
  ('Describe your best friend', 'A2', 'italian'),
  ('Talk about your hobbies and free time', 'A2', 'italian'),
  ('Describe a typical day at work or school', 'A2', 'italian'),
  ('Talk about your last vacation', 'A2', 'italian'),
  ('Discuss the pros and cons of social media', 'B1', 'italian'),
  ('Describe a memorable travel experience', 'B1', 'italian'),
  ('Talk about healthy lifestyle habits', 'B1', 'italian'),
  ('Discuss a book or movie you recently enjoyed', 'B1', 'italian'),
  ('Describe the city or town where you live', 'B1', 'italian'),
  ('Discuss the impact of technology on education', 'B2', 'italian'),
  ('Debate whether remote work is better than office work', 'B2', 'italian'),
  ('Describe a challenging situation and how you overcame it', 'B2', 'italian'),
  ('Discuss environmental issues in your country', 'B2', 'italian'),
  ('Talk about cultural differences you have observed', 'B2', 'italian'),
  ('Analyze the role of artificial intelligence in modern society', 'C1', 'italian'),
  ('Discuss the ethics of genetic engineering', 'C1', 'italian'),
  ('Debate the future of traditional media', 'C1', 'italian'),
  ('Discuss the relationship between language and identity', 'C1', 'italian'),
  ('Critically evaluate a current political issue', 'C2', 'italian'),
  ('Discuss the philosophical implications of consciousness', 'C2', 'italian'),
  ('Debate the balance between security and privacy', 'C2', 'italian');
