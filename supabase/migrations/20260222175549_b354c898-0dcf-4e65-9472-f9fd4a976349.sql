ALTER TABLE public.week_videos
  ADD COLUMN linked_video_id uuid REFERENCES public.youtube_videos(id),
  ADD COLUMN is_free boolean NOT NULL DEFAULT true;