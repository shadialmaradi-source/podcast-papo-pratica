-- Clean up existing data and add Coffee Break Portuguese with proper JSON casting
DELETE FROM exercises;
DELETE FROM podcast_episodes;
DELETE FROM podcast_sources;

-- Insert Coffee Break Portuguese podcast source
INSERT INTO podcast_sources (id, title, description, rss_url, language, category, difficulty_level, spotify_chart_rank, is_public, thumbnail_url) VALUES
(gen_random_uuid(), 'Coffee Break Portuguese', 'Learn Portuguese in just a few minutes a day with Coffee Break Portuguese', 'https://feeds.feedburner.com/coffeebreakportuguese', 'portuguese', 'Education', 'A1', 1, true, '/podcast-thumbs/coffee-break-portuguese.jpg');

-- Get the podcast source ID and insert episode
WITH source AS (
  SELECT id FROM podcast_sources WHERE title = 'Coffee Break Portuguese' LIMIT 1
)
INSERT INTO podcast_episodes (id, podcast_source_id, title, description, episode_url, audio_url, duration, publish_date, transcript, transcript_language, episode_number, season_number)
SELECT 
  gen_random_uuid(),
  source.id,
  'CBP 1.01 | Saying Hello in Portuguese',
  'Learn how to say hello and introduce yourself in Portuguese with Coffee Break Portuguese',
  'https://coffeebreaklanguages.com/coffee-break-portuguese-episode-1/',
  'https://www.radiolingua.com/media/cbp/cbp001.mp3',
  900,
  '2023-01-01 10:00:00+00',
  'Olá! Welcome to Coffee Break Portuguese. I''m your host, Kris Broholm. In this first episode, we''re going to learn how to say hello in Portuguese. The most common way to say hello is "Olá". You can use this at any time of day. Another way is "Oi", which is more informal. For good morning, we say "Bom dia". Good afternoon is "Boa tarde". And good evening is "Boa noite". To ask someone how they are, you can say "Como está?" or the more informal "Como estás?". The response is "Estou bem, obrigado" if you''re a man, or "Estou bem, obrigada" if you''re a woman. Let''s practice these phrases now.',
  'portuguese',
  1,
  1
FROM source;

-- Insert transcript-based exercises with proper JSON casting
WITH episode AS (
  SELECT id FROM podcast_episodes WHERE title = 'CBP 1.01 | Saying Hello in Portuguese' LIMIT 1
)
INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index)
SELECT 
  episode.id,
  'multiple_choice',
  'Como se diz "hello" em português?',
  '["Olá", "Tchau", "Por favor", "Com licença"]'::jsonb,
  'Olá',
  'No podcast aprendemos que "Olá" é a forma mais comum de dizer hello',
  'A1',
  10,
  1
FROM episode
UNION ALL
SELECT 
  episode.id,
  'multiple_choice',
  'Qual é a forma informal de dizer "hello"?',
  '["Olá", "Oi", "Bom dia", "Boa noite"]'::jsonb,
  'Oi',
  'O podcast explica que "Oi" é mais informal',
  'A1',
  10,
  2
FROM episode
UNION ALL
SELECT 
  episode.id,
  'multiple_choice',
  'Como se diz "good morning"?',
  '["Boa tarde", "Boa noite", "Bom dia", "Olá"]'::jsonb,
  'Bom dia',
  'No episódio aprendemos que "Bom dia" significa good morning',
  'A1',
  10,
  3
FROM episode
UNION ALL
SELECT 
  episode.id,
  'multiple_choice',
  'Como uma mulher responde "Estou bem"?',
  '["Estou bem, obrigado", "Estou bem, obrigada", "Estou bem, por favor", "Estou bem, tchau"]'::jsonb,
  'Estou bem, obrigada',
  'O podcast ensina que mulheres usam "obrigada"',
  'A1',
  15,
  4
FROM episode
UNION ALL
SELECT 
  episode.id,
  'fill_blank',
  'Para perguntar como alguém está, dizemos: "Como _____?"',
  '[]'::jsonb,
  'está',
  'Esta é a pergunta formal para "how are you" conforme o episódio',
  'A1',
  15,
  5
FROM episode;