-- Create video_topics junction table for multi-topic labeling
CREATE TABLE public.video_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, topic)
);

-- Create index for efficient querying
CREATE INDEX idx_video_topics_video_id ON public.video_topics(video_id);
CREATE INDEX idx_video_topics_topic ON public.video_topics(topic);

-- Enable RLS
ALTER TABLE public.video_topics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read video topics
CREATE POLICY "Anyone can read video topics"
  ON public.video_topics FOR SELECT USING (true);

-- Allow service role to insert topics
CREATE POLICY "Service role can insert video topics"
  ON public.video_topics FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Migrate existing categories to video_topics table
INSERT INTO public.video_topics (video_id, topic, is_primary)
SELECT id, LOWER(category), true
FROM public.youtube_videos
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (video_id, topic) DO NOTHING;