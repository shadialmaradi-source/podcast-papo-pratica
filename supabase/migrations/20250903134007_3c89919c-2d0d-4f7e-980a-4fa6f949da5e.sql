-- Add the specific episode with a new ID
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
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
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