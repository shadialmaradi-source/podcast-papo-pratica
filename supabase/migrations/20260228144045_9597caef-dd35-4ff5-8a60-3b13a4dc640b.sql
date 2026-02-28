
ALTER TABLE public.teacher_lessons
  ADD COLUMN IF NOT EXISTS lesson_type TEXT NOT NULL DEFAULT 'exercise_only',
  ADD COLUMN IF NOT EXISTS paragraph_prompt TEXT,
  ADD COLUMN IF NOT EXISTS paragraph_content TEXT,
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
