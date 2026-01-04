-- Delete analytics for videos without transcripts
DELETE FROM youtube_video_analytics 
WHERE video_id IN (
  SELECT v.id FROM youtube_videos v
  WHERE NOT EXISTS (
    SELECT 1 FROM youtube_transcripts t WHERE t.video_id = v.id
  )
);

-- Delete exercises for videos without transcripts
DELETE FROM youtube_exercises 
WHERE video_id IN (
  SELECT v.id FROM youtube_videos v
  WHERE NOT EXISTS (
    SELECT 1 FROM youtube_transcripts t WHERE t.video_id = v.id
  )
);

-- Delete videos without transcripts
DELETE FROM youtube_videos 
WHERE id IN (
  SELECT v.id FROM youtube_videos v
  WHERE NOT EXISTS (
    SELECT 1 FROM youtube_transcripts t WHERE t.video_id = v.id
  )
);