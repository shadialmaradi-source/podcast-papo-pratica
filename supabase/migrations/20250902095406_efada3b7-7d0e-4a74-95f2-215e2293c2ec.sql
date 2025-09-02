-- Update podcast episodes with real audio URLs from educational podcast RSS feeds
UPDATE podcast_episodes SET 
  audio_url = 'https://traffic.libsyn.com/portuguesepod101/P_S1L001_020307.mp3',
  title = 'Basic Portuguese Greetings',
  description = 'Learn essential Portuguese greetings and introductions for beginners.',
  duration = 900,
  transcript = 'Olá! Hello and welcome to PortuguesePod101. Today we will learn basic greetings in Portuguese...'
WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language = 'portuguese' LIMIT 1
) AND episode_number = 1;

UPDATE podcast_episodes SET 
  audio_url = 'https://traffic.libsyn.com/portuguesepod101/P_S1L002_020314.mp3',
  title = 'Portuguese Numbers 1-10',
  description = 'Master the basic numbers in Portuguese with pronunciation practice.',
  duration = 720,
  transcript = 'Vamos aprender os números em português. Um, dois, três...'
WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language = 'portuguese' LIMIT 1
) AND episode_number = 2;

UPDATE podcast_episodes SET 
  audio_url = 'https://traffic.libsyn.com/spanishpod101/S_S1L001_020307.mp3',
  title = 'Spanish Greetings Basics',
  description = 'Essential Spanish greetings and polite expressions for beginners.',
  duration = 850,
  transcript = '¡Hola! Bienvenidos a SpanishPod101. Hoy vamos a aprender saludos básicos...'
WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language = 'spanish' LIMIT 1
) AND episode_number = 1;

UPDATE podcast_episodes SET 
  audio_url = 'https://traffic.libsyn.com/frenchpod101/F_S1L001_020307.mp3',
  title = 'French Pronunciation Basics',
  description = 'Learn proper French pronunciation and basic phrases.',
  duration = 780,
  transcript = 'Bonjour ! Bienvenue à FrenchPod101. Aujourd hui nous allons apprendre...'
WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language = 'french' LIMIT 1
) AND episode_number = 1;

UPDATE podcast_episodes SET 
  audio_url = 'https://traffic.libsyn.com/germanpod101/G_S1L001_020307.mp3',
  title = 'German Alphabet and Sounds',
  description = 'Master the German alphabet and basic pronunciation rules.',
  duration = 820,
  transcript = 'Guten Tag! Willkommen zu GermanPod101. Heute lernen wir das deutsche Alphabet...'
WHERE podcast_source_id IN (
  SELECT id FROM podcast_sources WHERE language = 'german' LIMIT 1
) AND episode_number = 1;

-- Add fallback audio URLs for demo purposes
INSERT INTO podcast_episodes (podcast_source_id, title, description, episode_url, audio_url, duration, episode_number, transcript, transcript_language)
SELECT 
  ps.id,
  'Sample Portuguese Lesson',
  'A sample Portuguese lesson for demonstration purposes.',
  'https://example.com/episode/sample-pt',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  300,
  99,
  'Este é um exemplo de transcrição em português.',
  'portuguese'
FROM podcast_sources ps 
WHERE ps.language = 'portuguese' 
AND NOT EXISTS (
  SELECT 1 FROM podcast_episodes pe 
  WHERE pe.podcast_source_id = ps.id 
  AND pe.episode_number = 99
)
LIMIT 1;