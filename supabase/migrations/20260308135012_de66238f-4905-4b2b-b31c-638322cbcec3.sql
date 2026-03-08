ALTER TABLE public.youtube_videos ADD COLUMN IF NOT EXISTS is_short boolean NOT NULL DEFAULT false;

-- Backfill: mark videos with duration <= 60s as shorts
UPDATE public.youtube_videos SET is_short = true WHERE duration IS NOT NULL AND duration <= 60;