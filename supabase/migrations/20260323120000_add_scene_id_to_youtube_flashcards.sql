ALTER TABLE public.youtube_flashcards
ADD COLUMN IF NOT EXISTS scene_id uuid REFERENCES public.video_scenes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_youtube_flashcards_scene_context
ON public.youtube_flashcards(video_id, scene_id, difficulty, native_language);
