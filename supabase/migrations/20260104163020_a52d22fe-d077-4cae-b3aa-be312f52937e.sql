-- Update existing videos without categories with appropriate themes
UPDATE youtube_videos 
SET category = 'Cultura'
WHERE id = '0f4eab5a-3e35-442b-9fff-9fbf6783ce2e';

UPDATE youtube_videos 
SET category = 'Business'
WHERE id = 'a3cc3549-fa58-4573-9d59-7f733c3e129e';

UPDATE youtube_videos 
SET category = 'Viaggi'
WHERE id = 'fa939893-4c99-42b5-b6a0-f826b0056cd5';