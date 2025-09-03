-- Remove the extra episode, keep only the first one
DELETE FROM podcast_episodes 
WHERE podcast_source_id = '11111111-1111-1111-1111-111111111111' 
AND id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';