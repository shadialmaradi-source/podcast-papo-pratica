ALTER TABLE public.onboarding_videos 
  ADD COLUMN exercises jsonb DEFAULT NULL,
  ADD COLUMN speaking_phrases jsonb DEFAULT NULL,
  ADD COLUMN flashcards jsonb DEFAULT NULL;