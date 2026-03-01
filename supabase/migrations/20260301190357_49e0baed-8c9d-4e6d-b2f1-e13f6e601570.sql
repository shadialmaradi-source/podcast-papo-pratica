
-- Create onboarding_videos table
CREATE TABLE public.onboarding_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language text NOT NULL,
  level text NOT NULL,
  youtube_id text NOT NULL,
  start_time integer NOT NULL DEFAULT 0,
  duration integer NOT NULL DEFAULT 60,
  suggested_speed numeric NOT NULL DEFAULT 1.0,
  transcript text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(language, level)
);

-- Public read access (no auth required for onboarding)
ALTER TABLE public.onboarding_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view onboarding videos"
  ON public.onboarding_videos
  FOR SELECT
  USING (true);

-- Insert the 4 English onboarding videos
INSERT INTO public.onboarding_videos (language, level, youtube_id, duration, suggested_speed) VALUES
  ('english', 'absolute_beginner', 'qHb8dJ9XmDk', 60, 0.75),
  ('english', 'beginner', 'ileoFbDsd8M', 60, 0.8),
  ('english', 'intermediate', 'Q42YLweHhWA', 60, 1.0),
  ('english', 'advanced', 'fC76H7GyIM4', 60, 1.2);
