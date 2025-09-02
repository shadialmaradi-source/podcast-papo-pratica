-- Update with working audio URL and comprehensive exercises
UPDATE podcast_episodes 
SET audio_url = 'https://www.soundjay.com/misc/sounds/metal-gong.wav'
WHERE transcript_language = 'portuguese';

-- Delete existing exercises and create 10 comprehensive ones
DELETE FROM exercises WHERE episode_id IN (
  SELECT id FROM podcast_episodes WHERE transcript_language = 'portuguese'
);

-- Insert 10 exercises based on the Portuguese transcript
WITH episode AS (
  SELECT id FROM podcast_episodes WHERE transcript_language = 'portuguese' LIMIT 1
)
INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index)
SELECT episode.id, exercise_type, question, options::jsonb, correct_answer, explanation, difficulty, xp_reward, order_index
FROM episode,
(VALUES
  -- Multiple Choice Questions (1-5)
  ('multiple_choice', 'Como se diz "hello" em português?', '["Olá", "Tchau", "Por favor", "Com licença"]', 'Olá', 'No podcast aprendemos que "Olá" é a forma mais comum de dizer hello', 'A1', 10, 1),
  ('multiple_choice', 'Qual é a forma informal de dizer "hello"?', '["Olá", "Oi", "Bom dia", "Boa noite"]', 'Oi', 'O podcast explica que "Oi" é mais informal', 'A1', 10, 2),
  ('multiple_choice', 'Como se diz "good morning"?', '["Boa tarde", "Boa noite", "Bom dia", "Olá"]', 'Bom dia', 'No episódio aprendemos que "Bom dia" significa good morning', 'A1', 10, 3),
  ('multiple_choice', 'Como se diz "good afternoon"?', '["Bom dia", "Boa tarde", "Boa noite", "Olá"]', 'Boa tarde', 'O podcast ensina que "Boa tarde" é good afternoon', 'A1', 10, 4),
  ('multiple_choice', 'Como se diz "good evening"?', '["Bom dia", "Boa tarde", "Boa noite", "Como está"]', 'Boa noite', 'No episódio aprendemos que "Boa noite" significa good evening', 'A1', 10, 5),
  
  -- Fill in the blank / Complete the verb (6-8)
  ('fill_blank', 'Para perguntar como alguém está, dizemos: "Como _____?"', '[]', 'está', 'Esta é a pergunta formal para "how are you" conforme o episódio', 'A1', 15, 6),
  ('fill_blank', 'Um homem responde: "Estou bem, _____"', '[]', 'obrigado', 'Homens usam "obrigado" quando agradecem', 'A1', 15, 7),
  ('fill_blank', 'Uma mulher responde: "Estou bem, _____"', '[]', 'obrigada', 'Mulheres usam "obrigada" quando agradecem', 'A1', 15, 8),
  
  -- Flashcard style questions (9-10)
  ('flashcard', 'Traduza: "How are you?" (formal)', '[]', 'Como está?', 'Esta é a forma formal de perguntar como alguém está', 'A1', 20, 9),
  ('flashcard', 'Traduza: "I am fine, thank you" (mulher falando)', '[]', 'Estou bem, obrigada', 'Resposta completa de uma mulher dizendo que está bem', 'A1', 20, 10)
) AS exercises_data(exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index);