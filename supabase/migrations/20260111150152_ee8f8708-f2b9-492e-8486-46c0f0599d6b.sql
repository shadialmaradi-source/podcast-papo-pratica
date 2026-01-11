-- Fix: Replace overly permissive youtube_transcripts SELECT policy
-- Currently allows anyone (even unauthenticated) to read all transcripts
-- New policy: Only authenticated users can read transcripts for completed videos

DROP POLICY IF EXISTS "YouTube transcripts are viewable by everyone" ON public.youtube_transcripts;

-- Create new policy that requires authentication AND video must be completed
CREATE POLICY "Authenticated users can view transcripts for completed videos"
ON public.youtube_transcripts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.youtube_videos yv
    WHERE yv.id = youtube_transcripts.video_id
    AND yv.status = 'completed'
  )
);