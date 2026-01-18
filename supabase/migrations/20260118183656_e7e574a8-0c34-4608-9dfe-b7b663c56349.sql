-- Create youtube_flashcards table to store AI-generated flashcards
CREATE TABLE public.youtube_flashcards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id uuid NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
    phrase text NOT NULL,
    translation text NOT NULL,
    why text NOT NULL,
    order_index integer NOT NULL DEFAULT 0,
    difficulty text NOT NULL DEFAULT 'beginner',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups by video_id
CREATE INDEX idx_youtube_flashcards_video_id ON public.youtube_flashcards(video_id);

-- Enable Row Level Security
ALTER TABLE public.youtube_flashcards ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view flashcards for completed videos
CREATE POLICY "Users can view flashcards for completed videos"
ON public.youtube_flashcards
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.youtube_videos yv
        WHERE yv.id = youtube_flashcards.video_id
        AND (yv.status = 'completed' OR yv.added_by_user_id = auth.uid())
    )
);

-- RLS Policy: Allow service role to insert flashcards (for edge function)
CREATE POLICY "Service role can insert flashcards"
ON public.youtube_flashcards
FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role');