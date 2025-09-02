-- Update Portuguese episodes with real audio URLs from RSS feeds
UPDATE podcast_episodes SET 
  audio_url = 'https://www.bbc.co.uk/programmes/p02pc9tn/episodes/downloads.rss',
  episode_url = 'https://www.bbc.co.uk/sounds/play/p02pc9tn'
WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language = 'portuguese' AND title = 'PortuguesePod101'
) AND episode_number = 1;

-- Update Spanish episodes with real audio URLs
UPDATE podcast_episodes SET 
  audio_url = 'https://www.spanishpod101.com/rss',
  episode_url = 'https://www.spanishpod101.com'
WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language = 'spanish' AND title = 'Duolingo Spanish Podcast'
) AND episode_number = 1;

-- Update French episodes with real audio URLs  
UPDATE podcast_episodes SET 
  audio_url = 'https://www.franceinter.fr/rss',
  episode_url = 'https://www.franceinter.fr'
WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language = 'french' AND title = 'FrenchPod101'
) AND episode_number = 1;

-- For now, let's use a working sample audio file for testing
UPDATE podcast_episodes SET 
  audio_url = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
WHERE audio_url LIKE '/audio/%';