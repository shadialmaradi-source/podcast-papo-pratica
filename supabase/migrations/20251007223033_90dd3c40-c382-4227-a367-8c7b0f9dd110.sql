-- Delete the failed video and its related data
-- This will cascade delete related transcripts and exercises if foreign keys are set up
DELETE FROM youtube_videos 
WHERE id = '3b69bf8d-f077-4394-9828-be2b4361ce63';