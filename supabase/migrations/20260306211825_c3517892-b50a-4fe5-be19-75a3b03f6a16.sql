ALTER TABLE public.teacher_lessons 
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'italian',
  ADD COLUMN IF NOT EXISTS translation_language text NOT NULL DEFAULT 'english';