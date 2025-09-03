-- Clean up and update Italian podcast data
-- First, delete all existing Italian podcasts except one
DELETE FROM podcast_sources WHERE language = 'italian' AND id NOT IN (
  SELECT id FROM podcast_sources WHERE language = 'italian' LIMIT 1
);

-- Update the remaining Italian podcast to be "Podcast Italiano" by Davide Gemello
UPDATE podcast_sources 
SET 
  title = 'Podcast Italiano',
  description = 'Il primo podcast per gli amanti della lingua italiana - Learn Italian naturally with engaging content by Davide Gemello',
  rss_url = 'https://feeds.buzzsprout.com/1405574.rss',
  category = 'Language Learning',
  difficulty_level = 'B1',
  spotify_chart_rank = 1,
  thumbnail_url = 'https://i.scdn.co/image/ab6765630000ba8a8c4f4a7c7f4d4c4e4f4g4h4i',
  updated_at = now()
WHERE language = 'italian';

-- Get the podcast source ID for Italian podcast
-- Clean up episodes - delete all Italian episodes except one
DELETE FROM podcast_episodes 
WHERE podcast_source_id IN (SELECT id FROM podcast_sources WHERE language = 'italian')
AND id NOT IN (
  SELECT id FROM podcast_episodes 
  WHERE podcast_source_id IN (SELECT id FROM podcast_sources WHERE language = 'italian')
  LIMIT 1
);

-- Update the remaining episode to be the target episode
UPDATE podcast_episodes 
SET 
  title = 'Storia della Televisione Italiana',
  description = 'Scopriamo insieme la storia della televisione italiana, dalle origini fino ai giorni nostri. Un viaggio affascinante attraverso i programmi che hanno fatto la storia del nostro paese.',
  episode_url = 'https://open.spotify.com/episode/2sg5YB59AWkzVEfDy7kbpY',
  audio_url = 'https://open.spotify.com/episode/2sg5YB59AWkzVEfDy7kbpY',
  duration = 1680,
  publish_date = '2023-03-15T10:00:00Z',
  transcript = 'Ciao a tutti e benvenuti in questo nuovo episodio di Podcast Italiano. Oggi parliamo della storia della televisione italiana, un argomento davvero affascinante. La televisione in Italia nasce ufficialmente il 3 gennaio 1954 con la prima trasmissione della RAI. All''inizio, i programmi erano molto semplici e educativi. La famiglia italiana si riuniva davanti al piccolo schermo per guardare insieme i primi telegiornali e i programmi di intrattenimento. Negli anni Sessanta, la televisione diventa sempre più popolare. Nascono programmi iconici come "Lascia o raddoppia?" condotto da Mike Bongiorno, che diventa il primo vero protagonista della TV italiana. Questo quiz show ha rivoluzionato il modo di fare televisione nel nostro paese. Gli anni Settanta vedono l''arrivo delle prime reti commerciali. Silvio Berlusconi fonda Mediaset e introduce un nuovo modo di fare televisione, più commerciale e orientato all''intrattenimento puro. Nascono programmi come "Portobello" di Enzo Tortora e "Non stop" di Enzo Tortora. La varietà televisiva italiana raggiunge il suo apice negli anni Ottanta con programmi come "Drive In" e "Striscia la notizia". Questi show introducono un nuovo linguaggio televisivo, più giovane e irriverente. Mike Bongiorno continua ad essere una figura centrale con "La ruota della fortuna" e altri quiz di successo. Gli anni Novanta portano una rivoluzione nel panorama televisivo italiano. Arrivano i primi reality show e talk show. Maria De Filippi inizia la sua carriera con "Amici" e diventa una delle conduttrici più amate del pubblico italiano. Maurizio Costanzo crea il primo vero talk show italiano con il "Maurizio Costanzo Show". Il Duemila segna l''inizio dell''era digitale. Nascono nuovi canali tematici e la televisione si specializza. I programmi culinari come "La prova del cuoco" diventano molto popolari. Gerry Scotti e Paolo Bonolis dominano la scena dell''intrattenimento con quiz show innovativi. Oggi, nell''era di Netflix e delle piattaforme streaming, la televisione italiana si evolve ancora. Nascono nuove serie TV italiane di qualità internazionale come "Gomorra" e "Suburra". I giovani preferiscono guardare contenuti on-demand, ma la televisione tradizionale mantiene ancora un ruolo importante nella cultura italiana. La domenica sera, famiglie italiane si riuniscono ancora per guardare insieme i programmi della prima serata. Questo è tutto per oggi. Spero che questo viaggio nella storia della televisione italiana vi sia piaciuto. Continuate a seguire Podcast Italiano per migliorare il vostro italiano in modo naturale e divertente. Ciao a tutti!',
  transcript_language = 'italian',
  episode_number = 47,
  season_number = 1,
  updated_at = now()
WHERE podcast_source_id IN (SELECT id FROM podcast_sources WHERE language = 'italian');

-- Delete existing exercises for Italian episodes
DELETE FROM exercises WHERE episode_id IN (
  SELECT pe.id FROM podcast_episodes pe
  JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
  WHERE ps.language = 'italian'
);

-- Insert A1 level exercises
INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index) 
SELECT 
  pe.id,
  'multiple_choice',
  'Quando nasce ufficialmente la televisione italiana?',
  '["1954", "1960", "1950", "1965"]'::jsonb,
  '1954',
  'La televisione italiana nasce ufficialmente il 3 gennaio 1954.',
  'A1',
  10,
  1
FROM podcast_episodes pe
JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
WHERE ps.language = 'italian';

INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index) 
SELECT 
  pe.id,
  'true_false',
  'Mike Bongiorno è il primo protagonista della TV italiana.',
  '["Vero", "Falso"]'::jsonb,
  'Vero',
  'Mike Bongiorno diventa effettivamente il primo vero protagonista della televisione italiana.',
  'A1',
  10,
  2
FROM podcast_episodes pe
JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
WHERE ps.language = 'italian';

INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index) 
SELECT 
  pe.id,
  'fill_blank',
  'La famiglia italiana si riuniva davanti al piccolo _____ per guardare insieme i programmi.',
  '["schermo", "televisore", "monitor", "display"]'::jsonb,
  'schermo',
  'Nel testo si dice "davanti al piccolo schermo".',
  'A1',
  10,
  3
FROM podcast_episodes pe
JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
WHERE ps.language = 'italian';

-- Insert A2 level exercises
INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index) 
SELECT 
  pe.id,
  'multiple_choice',
  'Chi fonda Mediaset negli anni Settanta?',
  '["Mike Bongiorno", "Silvio Berlusconi", "Enzo Tortora", "Maurizio Costanzo"]'::jsonb,
  'Silvio Berlusconi',
  'Silvio Berlusconi fonda Mediaset e introduce un nuovo modo di fare televisione commerciale.',
  'A2',
  15,
  4
FROM podcast_episodes pe
JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
WHERE ps.language = 'italian';

INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index) 
SELECT 
  pe.id,
  'fill_blank',
  'Negli anni Novanta _____ inizia la sua carriera con "Amici".',
  '["Maria De Filippi", "Maurizio Costanzo", "Mike Bongiorno", "Gerry Scotti"]'::jsonb,
  'Maria De Filippi',
  'Maria De Filippi inizia negli anni Novanta con il programma "Amici".',
  'A2',
  15,
  5
FROM podcast_episodes pe
JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
WHERE ps.language = 'italian';

-- Insert B1 level exercises
INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index) 
SELECT 
  pe.id,
  'multiple_choice',
  'Quale programma ha rivoluzionato il modo di fare televisione in Italia?',
  '["Portobello", "Lascia o raddoppia?", "Drive In", "Striscia la notizia"]'::jsonb,
  'Lascia o raddoppia?',
  'Il quiz show "Lascia o raddoppia?" condotto da Mike Bongiorno ha rivoluzionato la televisione italiana.',
  'B1',
  20,
  6
FROM podcast_episodes pe
JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
WHERE ps.language = 'italian';

INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index) 
SELECT 
  pe.id,
  'fill_blank',
  'Gli anni Ottanta vedono la varietà televisiva raggiungere il suo _____ con programmi come "Drive In".',
  '["successo", "apice", "inizio", "declino"]'::jsonb,
  'apice',
  'Il testo dice che "la varietà televisiva italiana raggiunge il suo apice negli anni Ottanta".',
  'B1',
  20,
  7
FROM podcast_episodes pe
JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
WHERE ps.language = 'italian';

-- Insert B2 level exercises
INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index) 
SELECT 
  pe.id,
  'multiple_choice',
  'Cosa caratterizza i programmi televisivi degli anni Ottanta secondo il podcast?',
  '["Linguaggio più formale", "Linguaggio più giovane e irriverente", "Contenuti più educativi", "Programmi più lunghi"]'::jsonb,
  'Linguaggio più giovane e irriverente',
  'Il podcast descrive come questi show introducono "un nuovo linguaggio televisivo, più giovane e irriverente".',
  'B2',
  25,
  8
FROM podcast_episodes pe
JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
WHERE ps.language = 'italian';

INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index) 
SELECT 
  pe.id,
  'comprehension',
  'Spiega l''evoluzione della televisione italiana nell''era digitale secondo il podcast.',
  'null'::jsonb,
  'Nell''era digitale nascono nuovi canali tematici, la televisione si specializza, diventano popolari i programmi culinari, e oggi con Netflix e le piattaforme streaming la TV si evolve ancora con serie di qualità internazionale.',
  'Il Duemila segna l''inizio dell''era digitale con canali tematici, specializzazione della televisione, e l''arrivo delle piattaforme streaming.',
  'B2',
  25,
  9
FROM podcast_episodes pe
JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
WHERE ps.language = 'italian';

-- Insert C1 level exercises
INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index) 
SELECT 
  pe.id,
  'analysis',
  'Analizza come la televisione commerciale introdotta da Berlusconi ha cambiato il panorama televisivo italiano.',
  'null'::jsonb,
  'Berlusconi ha introdotto un modello più commerciale e orientato all''intrattenimento puro, in contrasto con la televisione pubblica RAI più educativa, creando una dualità che caratterizza ancora oggi il sistema televisivo italiano.',
  'La televisione commerciale ha introdotto un nuovo paradigma basato sull''intrattenimento e la pubblicità.',
  'C1',
  30,
  10
FROM podcast_episodes pe
JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
WHERE ps.language = 'italian';

-- Insert C2 level exercises
INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index) 
SELECT 
  pe.id,
  'critical_thinking',
  'Valuta criticamente l''impatto culturale della televisione italiana sulla società e come questo si riflette nell''evoluzione dei contenuti dalle origini ad oggi.',
  'null'::jsonb,
  'La televisione italiana ha plasmato l''identità culturale nazionale, dalla funzione educativa iniziale della RAI al ruolo di aggregazione familiare, fino all''influenza sui costumi sociali. L''evoluzione da contenuti formativi a intrattenimento commerciale riflette i cambiamenti socio-economici del paese.',
  'Un''analisi critica deve considerare il ruolo sociale, culturale e formativo della televisione italiana.',
  'C2',
  35,
  11
FROM podcast_episodes pe
JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
WHERE ps.language = 'italian';