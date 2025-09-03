-- Remove all languages except Italian and Portuguese
DELETE FROM user_exercise_results WHERE exercise_id IN (
  SELECT e.id FROM exercises e 
  JOIN podcast_episodes pe ON e.episode_id = pe.id
  JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
  WHERE ps.language NOT IN ('italian', 'portuguese')
);

DELETE FROM exercises WHERE episode_id IN (
  SELECT pe.id FROM podcast_episodes pe
  JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
  WHERE ps.language NOT IN ('italian', 'portuguese')
);

DELETE FROM user_episode_progress WHERE episode_id IN (
  SELECT pe.id FROM podcast_episodes pe
  JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
  WHERE ps.language NOT IN ('italian', 'portuguese')
);

DELETE FROM podcast_episodes WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language NOT IN ('italian', 'portuguese')
);

DELETE FROM podcast_sources WHERE language NOT IN ('italian', 'portuguese');

-- Remove all Italian podcasts except the one we want to keep, and update it
DELETE FROM user_exercise_results WHERE exercise_id IN (
  SELECT e.id FROM exercises e 
  JOIN podcast_episodes pe ON e.episode_id = pe.id
  JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
  WHERE ps.language = 'italian' AND ps.id != '11111111-1111-1111-1111-111111111111'
);

DELETE FROM exercises WHERE episode_id IN (
  SELECT pe.id FROM podcast_episodes pe
  JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
  WHERE ps.language = 'italian' AND ps.id != '11111111-1111-1111-1111-111111111111'
);

DELETE FROM user_episode_progress WHERE episode_id IN (
  SELECT pe.id FROM podcast_episodes pe
  JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
  WHERE ps.language = 'italian' AND ps.id != '11111111-1111-1111-1111-111111111111'
);

DELETE FROM podcast_episodes WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language = 'italian' AND id != '11111111-1111-1111-1111-111111111111'
);

DELETE FROM podcast_sources WHERE language = 'italian' AND id != '11111111-1111-1111-1111-111111111111';

-- Update the remaining Italian podcast with the correct information
UPDATE podcast_sources 
SET 
  title = 'Racconti di Storia Italiana',
  description = 'Un podcast che racconta la storia italiana attraverso episodi coinvolgenti e ben documentati',
  rss_url = 'https://feeds.buzzsprout.com/raccontistoriaitaliana.rss',
  category = 'Storia',
  difficulty_level = 'B2',
  spotify_chart_rank = 1,
  thumbnail_url = 'https://i.scdn.co/image/ab6765630000ba8a123456789abcdef123456789'
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Remove all episodes for this podcast and add the specific one
DELETE FROM exercises WHERE episode_id IN (
  SELECT id FROM podcast_episodes WHERE podcast_source_id = '11111111-1111-1111-1111-111111111111'
);

DELETE FROM user_episode_progress WHERE episode_id IN (
  SELECT id FROM podcast_episodes WHERE podcast_source_id = '11111111-1111-1111-1111-111111111111'
);

DELETE FROM podcast_episodes WHERE podcast_source_id = '11111111-1111-1111-1111-111111111111';

-- Add the specific episode
INSERT INTO podcast_episodes (
  id,
  podcast_source_id,
  title,
  description,
  episode_url,
  audio_url,
  duration,
  publish_date,
  transcript,
  transcript_language,
  episode_number,
  season_number
) VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '11111111-1111-1111-1111-111111111111',
  'Storia della Televisione Italiana',
  'Un affascinante viaggio attraverso la storia della televisione italiana, dai suoi inizi negli anni 50 fino ai giorni nostri',
  'https://open.spotify.com/episode/2sg5YB59AWkzVEfDy7kbpY',
  'https://open.spotify.com/episode/2sg5YB59AWkzVEfDy7kbpY',
  2400,
  '2024-01-15T00:00:00Z',
  'La televisione italiana nasce ufficialmente il 3 gennaio 1954...',
  'italian',
  1,
  1
);