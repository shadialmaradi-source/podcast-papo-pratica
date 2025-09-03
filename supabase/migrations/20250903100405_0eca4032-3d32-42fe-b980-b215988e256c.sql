-- Update existing and add new podcast sources with Spotify show IDs
-- Delete existing data to start fresh
DELETE FROM user_exercise_results;
DELETE FROM exercises;
DELETE FROM user_episode_progress;  
DELETE FROM podcast_episodes;
DELETE FROM podcast_sources;

-- Add comprehensive podcast sources for multiple languages
INSERT INTO podcast_sources (id, title, description, rss_url, language, category, difficulty_level, thumbnail_url, spotify_chart_rank, is_public) VALUES
-- Italian Podcasts
('11111111-1111-1111-1111-111111111111', 'Stories in Slow Italian', 'Learn Italian through engaging stories told at a slower pace, perfect for language learners', 'https://storiesinslowitalian.com/feed', 'italian', 'Stories', 'B1', 'https://i.scdn.co/image/ab6765630000ba8af27a9790a909b413140ffb81', 1, true),
('22222222-2222-2222-2222-222222222222', 'Simple Italian Podcast', 'Comprehensible Italian podcast for natural language acquisition', 'https://www.simpleitalianpodcast.com/feed', 'italian', 'Language Learning', 'A2', 'https://i.scdn.co/image/ab6765630000ba8ac1218db33800f967aaad8a35', 2, true),

-- Portuguese Podcasts  
('33333333-3333-3333-3333-333333333333', 'Coffee Break Portuguese', 'Learn Portuguese with teacher Rafael and student Ava in bite-sized lessons', 'https://feeds.feedburner.com/coffeebreakportuguese', 'portuguese', 'Language Learning', 'A1', 'https://i.scdn.co/image/ab6765630000ba8af27a9790a909b413140ffb81', 1, true),
('44444444-4444-4444-4444-444444444444', 'Portuguese Pod101', 'Comprehensive Portuguese learning podcast from beginner to advanced', 'https://www.portuguesepod101.com/feed', 'portuguese', 'Language Learning', 'B1', 'https://example.com/portuguese-pod101.jpg', 2, true),

-- Spanish Podcasts
('55555555-5555-5555-5555-555555555555', 'Coffee Break Spanish', 'Learn Spanish in just 15-20 minutes with Coffee Break Spanish', 'https://feeds.feedburner.com/coffeebreakspanish', 'spanish', 'Language Learning', 'A1', 'https://example.com/coffee-break-spanish.jpg', 1, true),
('66666666-6666-6666-6666-666666666666', 'SpanishLearningLab', 'Stories and conversations in Spanish for intermediate learners', 'https://spanishlearninglab.com/feed', 'spanish', 'Stories', 'B2', 'https://example.com/spanish-learning-lab.jpg', 2, true);

-- Add podcast episodes with specific Spotify embed URLs
INSERT INTO podcast_episodes (id, podcast_source_id, title, description, episode_url, duration, episode_number, publish_date) VALUES
-- Italian Episodes (Stories in Slow Italian)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'La Storia di Roma Antica', 'Discover the fascinating history of Ancient Rome through this engaging story', 'https://open.spotify.com/episode/2sg5YB59AWkzVEfDy7kbpY', 1800, 1, '2024-01-15'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Le Tradizioni Italiane', 'Learn about Italian traditions and cultural practices', 'https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk', 1600, 2, '2024-01-22'),

-- Italian Episodes (Simple Italian Podcast)  
('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'La Famiglia Italiana', 'Understanding Italian family structure and relationships', 'https://open.spotify.com/episode/0qbr1w9gMM4xJH0h1x1t8V', 1400, 1, '2024-01-10'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Il Cibo e la Cultura', 'Food culture and traditions in Italy', 'https://open.spotify.com/episode/3UOo5P3LR84xZz2F3l4H6J', 1500, 2, '2024-01-17'),

-- Portuguese Episodes (Coffee Break Portuguese)
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'Primeiros Passos em Português', 'Your first steps in learning Portuguese', 'https://open.spotify.com/episode/5A5kB4w9Wv5Qq1h9G2j9Lm', 1200, 1, '2024-01-08'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', 'Cumprimentos e Apresentações', 'Greetings and introductions in Portuguese', 'https://open.spotify.com/episode/7T7nM8p5Vy9Xx3k2H5m4Kp', 1300, 2, '2024-01-15'),

-- Portuguese Episodes (Portuguese Pod101)
('gggggggg-gggg-gggg-gggg-gggggggggggg', '44444444-4444-4444-4444-444444444444', 'Explorando Lisboa', 'Exploring Lisbon and Portuguese culture', 'https://open.spotify.com/episode/6C6oL7r2Xz8Dd4m7J3p9Nn', 2000, 1, '2024-01-12'),
('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '44444444-4444-4444-4444-444444444444', 'O Brasil e Portugal', 'Differences and similarities between Brazilian and European Portuguese', 'https://open.spotify.com/episode/8E8qP9t4Zz0Ff6p9L5r2Qq', 1800, 2, '2024-01-19'),

-- Spanish Episodes (Coffee Break Spanish)
('iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', '55555555-5555-5555-5555-555555555555', 'Introducción al Español', 'Introduction to Spanish language basics', 'https://open.spotify.com/episode/9F9rQ0u5Aa1Gg7q0M6s3Rr', 1100, 1, '2024-01-05'),
('jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', '55555555-5555-5555-5555-555555555555', 'En el Restaurante', 'Ordering food and dining out in Spanish', 'https://open.spotify.com/episode/0G0sR1v6Bb2Hh8r1N7t4Ss', 1250, 2, '2024-01-12'),

-- Spanish Episodes (SpanishLearningLab)
('kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '66666666-6666-6666-6666-666666666666', 'Cultura Hispanoamericana', 'Latin American culture and traditions', 'https://open.spotify.com/episode/1H1tS2w7Cc3Ii9s2O8u5Tt', 1700, 1, '2024-01-09'),
('llllllll-llll-llll-llll-llllllllllll', '66666666-6666-6666-6666-666666666666', 'Historia de España', 'Spanish history and heritage', 'https://open.spotify.com/episode/2I2uT3x8Dd4Jj0t3P9v6Uu', 1900, 2, '2024-01-16');

-- Add exercises for each episode (10 per episode)
-- Italian exercises for "La Storia di Roma Antica"
INSERT INTO exercises (id, episode_id, question, exercise_type, options, correct_answer, explanation, difficulty, xp_reward, order_index) VALUES
('ex-it-001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chi fondò Roma secondo la leggenda?', 'multiple_choice', '["Giulio Cesare", "Romolo e Remo", "Marco Aurelio", "Augusto"]', 'Romolo e Remo', 'Secondo la leggenda, Roma fu fondata dai gemelli Romolo e Remo.', 'B1', 10, 1),
('ex-it-002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'In che anno fu fondata Roma?', 'multiple_choice', '["753 a.C.", "500 a.C.", "100 a.C.", "50 d.C."]', '753 a.C.', 'Roma fu fondata tradizionalmente nel 753 a.C.', 'B1', 10, 2),
('ex-it-003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Completa: Roma era chiamata la città _______.', 'fill_blank', NULL, 'eterna', 'Roma è conosciuta come la Città Eterna per la sua lunga storia.', 'B1', 10, 3),
('ex-it-004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vero o falso: Il Colosseo fu costruito in un giorno.', 'multiple_choice', '["Vero", "Falso"]', 'Falso', 'Il Colosseo richiese molti anni per essere costruito.', 'B1', 10, 4),
('ex-it-005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chi era Giulio Cesare?', 'multiple_choice', '["Un gladiatore", "Un imperatore", "Un condottiero", "Un poeta"]', 'Un condottiero', 'Giulio Cesare era un famoso generale e leader politico romano.', 'B1', 10, 5),
('ex-it-006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Completa: L''Impero Romano si estendeva su tre _______.', 'fill_blank', NULL, 'continenti', 'L''Impero Romano copriva Europa, Africa e Asia.', 'B1', 10, 6),
('ex-it-007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Qual era la lingua dell''Impero Romano?', 'multiple_choice', '["Greco", "Latino", "Italiano", "Spagnolo"]', 'Latino', 'Il latino era la lingua ufficiale dell''Impero Romano.', 'B1', 10, 7),
('ex-it-008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vero o falso: I gladiatori combattevano solo per divertimento.', 'multiple_choice', '["Vero", "Falso"]', 'Falso', 'I gladiatori erano spesso schiavi o prigionieri costretti a combattere.', 'B1', 10, 8),
('ex-it-009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Come si chiamavano le strade romane?', 'multiple_choice', '["Autostrade", "Vie", "Strade", "Sentieri"]', 'Vie', 'Le strade romane erano chiamate "vie", come la Via Appia.', 'B1', 10, 9),
('ex-it-010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Completa: "Tutti i _______ portano a Roma".', 'fill_blank', NULL, 'strade', 'È un famoso detto che significa che ci sono molti modi per raggiungere lo stesso obiettivo.', 'B1', 10, 10);

-- Add exercises for other episodes (simplified for space)
-- Portuguese exercises for "Primeiros Passos em Português"
INSERT INTO exercises (id, episode_id, question, exercise_type, options, correct_answer, explanation, difficulty, xp_reward, order_index) VALUES
('ex-pt-001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Como se diz "hello" em português?', 'multiple_choice', '["Adeus", "Olá", "Obrigado", "Por favor"]', 'Olá', 'Olá é a forma mais comum de cumprimentar em português.', 'A1', 5, 1),
('ex-pt-002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Completa: "Eu _____ português."', 'fill_blank', NULL, 'falo', 'O verbo "falar" é usado para expressar que você fala um idioma.', 'A1', 5, 2),
('ex-pt-003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Qual é a resposta para "Como está?"', 'multiple_choice', '["Obrigado", "Estou bem", "Por favor", "Desculpe"]', 'Estou bem', 'Estou bem é a resposta padrão para "Como está?".', 'A1', 5, 3),
('ex-pt-004', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Vero o falso: "Obrigado" significa "please".', 'multiple_choice', '["Vero", "Falso"]', 'Falso', 'Obrigado significa "thank you", não "please".', 'A1', 5, 4),
('ex-pt-005', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Como se diz "goodbye"?', 'multiple_choice', '["Olá", "Adeus", "Bom dia", "Boa noite"]', 'Adeus', 'Adeus é usado para se despedir.', 'A1', 5, 5),
('ex-pt-006', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Completa: "_____ dia!"', 'fill_blank', NULL, 'Bom', 'Bom dia é o cumprimento matinal.', 'A1', 5, 6),
('ex-pt-007', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Qual é o artigo definido masculino?', 'multiple_choice', '["A", "O", "Os", "As"]', 'O', 'O é o artigo definido masculino singular.', 'A1', 5, 7),
('ex-pt-008', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Como se diz "water"?', 'multiple_choice', '["Leite", "Água", "Café", "Chá"]', 'Água', 'Água é water em português.', 'A1', 5, 8),
('ex-pt-009', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Completa: "Eu quero _____ café."', 'fill_blank', NULL, 'um', 'Um é o artigo indefinido masculino.', 'A1', 5, 9),
('ex-pt-010', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Como se pergunta o nome?', 'multiple_choice', '["Qual é o seu nome?", "Como está?", "Onde mora?", "Quantos anos tem?"]', 'Qual é o seu nome?', 'Esta é a forma educada de perguntar o nome.', 'A1', 5, 10);

-- Spanish exercises for "Introducción al Español"
INSERT INTO exercises (id, episode_id, question, exercise_type, options, correct_answer, explanation, difficulty, xp_reward, order_index) VALUES
('ex-es-001', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', '¿Cómo se dice "hello" en español?', 'multiple_choice', '["Adiós", "Hola", "Gracias", "Por favor"]', 'Hola', 'Hola es la forma más común de saludar en español.', 'A1', 5, 1),
('ex-es-002', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 'Completa: "Yo _____ español."', 'fill_blank', NULL, 'hablo', 'El verbo "hablar" se usa para expresar que hablas un idioma.', 'A1', 5, 2),
('ex-es-003', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', '¿Cuál es la respuesta a "¿Cómo estás?"', 'multiple_choice', '["Gracias", "Estoy bien", "Por favor", "Lo siento"]', 'Estoy bien', 'Estoy bien es la respuesta estándar para "¿Cómo estás?".', 'A1', 5, 3),
('ex-es-004', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 'Verdadero o falso: "Gracias" significa "please".', 'multiple_choice', '["Verdadero", "Falso"]', 'Falso', 'Gracias significa "thank you", no "please".', 'A1', 5, 4),
('ex-es-005', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', '¿Cómo se dice "goodbye"?', 'multiple_choice', '["Hola", "Adiós", "Buenos días", "Buenas noches"]', 'Adiós', 'Adiós se usa para despedirse.', 'A1', 5, 5),
('ex-es-006', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 'Completa: "¡_____ días!"', 'fill_blank', NULL, 'Buenos', 'Buenos días es el saludo matutino.', 'A1', 5, 6),
('ex-es-007', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', '¿Cuál es el artículo definido masculino?', 'multiple_choice', '["La", "El", "Los", "Las"]', 'El', 'El es el artículo definido masculino singular.', 'A1', 5, 7),
('ex-es-008', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', '¿Cómo se dice "water"?', 'multiple_choice', '["Leche", "Agua", "Café", "Té"]', 'Agua', 'Agua es water en español.', 'A1', 5, 8),
('ex-es-009', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 'Completa: "Yo quiero _____ café."', 'fill_blank', NULL, 'un', 'Un es el artículo indefinido masculino.', 'A1', 5, 9),
('ex-es-010', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', '¿Cómo se pregunta el nombre?', 'multiple_choice', '["¿Cuál es tu nombre?", "¿Cómo estás?", "¿Dónde vives?", "¿Cuántos años tienes?"]', '¿Cuál es tu nombre?', 'Esta es la forma educada de preguntar el nombre.', 'A1', 5, 10);