-- Update episodes with real Spotify episode IDs for better integration
UPDATE podcast_episodes SET 
  episode_url = 'https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk',
  audio_url = 'spotify:episode:4rOoJ6Egrf8K2IrywzwOMk'
WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language = 'portuguese'
) AND episode_number = 1;

UPDATE podcast_episodes SET 
  episode_url = 'https://open.spotify.com/episode/6kAsbP8pxwaU2kPibKTuHE',
  audio_url = 'spotify:episode:6kAsbP8pxwaU2kPibKTuHE'
WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language = 'spanish'
) AND episode_number = 1;

UPDATE podcast_episodes SET 
  episode_url = 'https://open.spotify.com/episode/0VXyq8pO9sFxufyAZO6fZ4',
  audio_url = 'spotify:episode:0VXyq8pO9sFxufyAZO6fZ4'
WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language = 'french'
) AND episode_number = 1;

UPDATE podcast_episodes SET 
  episode_url = 'https://open.spotify.com/episode/1Je4ccKOqRir4FTUE8nOhy',
  audio_url = 'spotify:episode:1Je4ccKOqRir4FTUE8nOhy'
WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language = 'german'
) AND episode_number = 1;