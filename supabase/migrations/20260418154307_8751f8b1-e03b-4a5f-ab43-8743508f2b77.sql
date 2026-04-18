ALTER TABLE public.user_created_flashcards
  ALTER COLUMN video_id DROP NOT NULL;

ALTER TABLE public.user_created_flashcards
  ADD COLUMN IF NOT EXISTS source_lesson_id UUID REFERENCES public.teacher_lessons(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_created_flashcards_source_lesson
  ON public.user_created_flashcards (source_lesson_id);

CREATE INDEX IF NOT EXISTS idx_user_created_flashcards_user_source_lesson
  ON public.user_created_flashcards (user_id, source_lesson_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_created_flashcards_video_or_lesson_check'
  ) THEN
    ALTER TABLE public.user_created_flashcards
      ADD CONSTRAINT user_created_flashcards_video_or_lesson_check
      CHECK (video_id IS NOT NULL OR source_lesson_id IS NOT NULL);
  END IF;
END $$;