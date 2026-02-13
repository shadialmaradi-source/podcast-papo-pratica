-- Add question_translation column for translation hints
ALTER TABLE public.youtube_exercises
ADD COLUMN question_translation text;