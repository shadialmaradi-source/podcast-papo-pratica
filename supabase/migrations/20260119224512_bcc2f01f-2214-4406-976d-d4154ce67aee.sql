-- Create table to track which flashcards each user has viewed
CREATE TABLE public.user_viewed_flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  flashcard_id UUID NOT NULL REFERENCES public.youtube_flashcards(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  first_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  times_reviewed INTEGER NOT NULL DEFAULT 1,
  is_mastered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, flashcard_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_viewed_flashcards ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own flashcard records"
ON public.user_viewed_flashcards
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcard records"
ON public.user_viewed_flashcards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard records"
ON public.user_viewed_flashcards
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_viewed_flashcards_user_id ON public.user_viewed_flashcards(user_id);
CREATE INDEX idx_user_viewed_flashcards_video_id ON public.user_viewed_flashcards(video_id);