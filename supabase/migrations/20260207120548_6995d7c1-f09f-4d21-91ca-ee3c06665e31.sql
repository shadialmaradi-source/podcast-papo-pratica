
-- Create table for caching AI-suggested vocabulary words per video transcript
CREATE TABLE public.transcript_word_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL DEFAULT 'intermediate',
  phrase TEXT NOT NULL,
  translation TEXT NOT NULL,
  part_of_speech TEXT,
  why TEXT,
  segment_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups by video
CREATE INDEX idx_transcript_word_suggestions_video ON public.transcript_word_suggestions(video_id, difficulty);

-- Enable RLS
ALTER TABLE public.transcript_word_suggestions ENABLE ROW LEVEL SECURITY;

-- These are cached suggestions visible to all authenticated users (not user-specific data)
CREATE POLICY "Authenticated users can view transcript word suggestions"
  ON public.transcript_word_suggestions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can insert (via edge function)
CREATE POLICY "Service role can insert transcript word suggestions"
  ON public.transcript_word_suggestions
  FOR INSERT
  WITH CHECK (true);
