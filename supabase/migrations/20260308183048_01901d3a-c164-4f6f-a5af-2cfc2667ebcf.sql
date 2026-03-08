
-- 1. Create video_scenes table
CREATE TABLE public.video_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  scene_index integer NOT NULL DEFAULT 0,
  start_time numeric NOT NULL DEFAULT 0,
  end_time numeric NOT NULL DEFAULT 0,
  scene_title text NOT NULL DEFAULT '',
  scene_transcript text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_id, scene_index)
);

ALTER TABLE public.video_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view scenes"
  ON public.video_scenes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage scenes"
  ON public.video_scenes FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- 2. Create user_scene_progress table
CREATE TABLE public.user_scene_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  current_scene integer NOT NULL DEFAULT 0,
  completed_scenes integer[] NOT NULL DEFAULT '{}',
  last_timestamp numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.user_scene_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scene progress"
  ON public.user_scene_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scene progress"
  ON public.user_scene_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scene progress"
  ON public.user_scene_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Add scene_id column to youtube_exercises
ALTER TABLE public.youtube_exercises ADD COLUMN scene_id uuid REFERENCES public.video_scenes(id) ON DELETE SET NULL;
