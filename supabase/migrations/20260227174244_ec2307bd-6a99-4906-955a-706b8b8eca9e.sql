
ALTER TABLE public.youtube_flashcards ADD COLUMN native_language TEXT DEFAULT 'en';

UPDATE public.youtube_flashcards SET native_language = 'en' WHERE native_language IS NULL;
