-- Create table for user-created flashcards from transcript selections
CREATE TABLE public.user_created_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,
  translation TEXT,
  part_of_speech TEXT,
  example_sentence TEXT,
  notes TEXT,
  source_timestamp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_mastered BOOLEAN NOT NULL DEFAULT FALSE,
  times_reviewed INTEGER NOT NULL DEFAULT 0
);

-- Create indexes for fast lookups
CREATE INDEX idx_user_created_flashcards_user ON public.user_created_flashcards(user_id);
CREATE INDEX idx_user_created_flashcards_video ON public.user_created_flashcards(video_id);
CREATE INDEX idx_user_created_flashcards_user_video ON public.user_created_flashcards(user_id, video_id);

-- Enable Row Level Security
ALTER TABLE public.user_created_flashcards ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own flashcards
CREATE POLICY "Users can view own created flashcards"
  ON public.user_created_flashcards
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flashcards"
  ON public.user_created_flashcards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own created flashcards"
  ON public.user_created_flashcards
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own created flashcards"
  ON public.user_created_flashcards
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_user_created_flashcards_updated_at
  BEFORE UPDATE ON public.user_created_flashcards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();