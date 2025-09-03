-- Update the existing episode with the correct information
UPDATE podcast_episodes 
SET 
  title = 'Storia della Televisione Italiana',
  description = 'Un affascinante viaggio attraverso la storia della televisione italiana, dai suoi inizi negli anni 50 fino ai giorni nostri',
  episode_url = 'https://open.spotify.com/episode/2sg5YB59AWkzVEfDy7kbpY',
  audio_url = 'https://open.spotify.com/episode/2sg5YB59AWkzVEfDy7kbpY',
  duration = 2400,
  publish_date = '2024-01-15T00:00:00Z',
  transcript = 'La televisione italiana nasce ufficialmente il 3 gennaio 1954...',
  transcript_language = 'italian',
  episode_number = 1,
  season_number = 1
WHERE podcast_source_id = '11111111-1111-1111-1111-111111111111';