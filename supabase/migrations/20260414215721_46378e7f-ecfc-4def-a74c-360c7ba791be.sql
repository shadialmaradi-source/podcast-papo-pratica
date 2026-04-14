INSERT INTO public.youtube_videos (video_id, title, language, difficulty_level, status, thumbnail_url)
SELECT DISTINCT ON (extracted_id)
  extracted_id AS video_id,
  COALESCE(tl.title, 'YouTube Video') AS title,
  COALESCE(tl.language, 'italian') AS language,
  'beginner' AS difficulty_level,
  'ready' AS status,
  'https://img.youtube.com/vi/' || extracted_id || '/hqdefault.jpg' AS thumbnail_url
FROM (
  SELECT *,
    COALESCE(
      (regexp_match(youtube_url, '[?&]v=([a-zA-Z0-9_-]{11})'))[1],
      (regexp_match(youtube_url, 'youtu\.be/([a-zA-Z0-9_-]{11})'))[1],
      (regexp_match(youtube_url, '/shorts/([a-zA-Z0-9_-]{11})'))[1],
      (regexp_match(youtube_url, '/embed/([a-zA-Z0-9_-]{11})'))[1]
    ) AS extracted_id
  FROM public.teacher_lessons
  WHERE youtube_url IS NOT NULL AND lesson_type = 'youtube'
) tl
WHERE extracted_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.youtube_videos yv WHERE yv.video_id = extracted_id
  )
ORDER BY extracted_id, tl.created_at ASC;