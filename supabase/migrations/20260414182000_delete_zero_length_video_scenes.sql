-- Remove invalid zero-length scenes so they can be regenerated with valid timing.
DELETE FROM public.video_scenes
WHERE start_time = 0
  AND end_time = 0;
