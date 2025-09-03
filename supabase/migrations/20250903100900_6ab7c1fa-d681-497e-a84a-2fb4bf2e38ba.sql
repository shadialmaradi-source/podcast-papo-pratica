-- Add 10 exercises for each episode with proper UUIDs
-- Italian exercises for "La Storia di Roma Antica" (Stories in Slow Italian)
INSERT INTO exercises (id, episode_id, question, exercise_type, options, correct_answer, explanation, difficulty, xp_reward, order_index) VALUES
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chi fondò Roma secondo la leggenda?', 'multiple_choice', '["Giulio Cesare", "Romolo e Remo", "Marco Aurelio", "Augusto"]', 'Romolo e Remo', 'Secondo la leggenda, Roma fu fondata dai gemelli Romolo e Remo.', 'B1', 10, 1),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'In che anno fu fondata Roma?', 'multiple_choice', '["753 a.C.", "500 a.C.", "100 a.C.", "50 d.C."]', '753 a.C.', 'Roma fu fondata tradizionalmente nel 753 a.C.', 'B1', 10, 2),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Completa: Roma era chiamata la città _______.', 'fill_blank', NULL, 'eterna', 'Roma è conosciuta come la Città Eterna per la sua lunga storia.', 'B1', 10, 3),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vero o falso: Il Colosseo fu costruito in un giorno.', 'multiple_choice', '["Vero", "Falso"]', 'Falso', 'Il Colosseo richiese molti anni per essere costruito.', 'B1', 10, 4),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chi era Giulio Cesare?', 'multiple_choice', '["Un gladiatore", "Un imperatore", "Un condottiero", "Un poeta"]', 'Un condottiero', 'Giulio Cesare era un famoso generale e leader politico romano.', 'B1', 10, 5),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Completa: L''Impero Romano si estendeva su tre _______.', 'fill_blank', NULL, 'continenti', 'L''Impero Romano copriva Europa, Africa e Asia.', 'B1', 10, 6),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Qual era la lingua dell''Impero Romano?', 'multiple_choice', '["Greco", "Latino", "Italiano", "Spagnolo"]', 'Latino', 'Il latino era la lingua ufficiale dell''Impero Romano.', 'B1', 10, 7),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vero o falso: I gladiatori combattevano solo per divertimento.', 'multiple_choice', '["Vero", "Falso"]', 'Falso', 'I gladiatori erano spesso schiavi o prigionieri costretti a combattere.', 'B1', 10, 8),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Come si chiamavano le strade romane?', 'multiple_choice', '["Autostrade", "Vie", "Strade", "Sentieri"]', 'Vie', 'Le strade romane erano chiamate "vie", come la Via Appia.', 'B1', 10, 9),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Completa: "Tutti i _______ portano a Roma".', 'fill_blank', NULL, 'strade', 'È un famoso detto che significa che ci sono molti modi per raggiungere lo stesso obiettivo.', 'B1', 10, 10);

-- Portuguese exercises for "Primeiros Passos em Português" (Coffee Break Portuguese)  
INSERT INTO exercises (id, episode_id, question, exercise_type, options, correct_answer, explanation, difficulty, xp_reward, order_index) VALUES
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Como se diz "hello" em português?', 'multiple_choice', '["Adeus", "Olá", "Obrigado", "Por favor"]', 'Olá', 'Olá é a forma mais comum de cumprimentar em português.', 'A1', 5, 1),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Completa: "Eu _____ português."', 'fill_blank', NULL, 'falo', 'O verbo "falar" é usado para expressar que você fala um idioma.', 'A1', 5, 2),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Qual é a resposta para "Como está?"', 'multiple_choice', '["Obrigado", "Estou bem", "Por favor", "Desculpe"]', 'Estou bem', 'Estou bem é a resposta padrão para "Como está?".', 'A1', 5, 3),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Verdadeiro ou falso: "Obrigado" significa "please".', 'multiple_choice', '["Verdadeiro", "Falso"]', 'Falso', 'Obrigado significa "thank you", não "please".', 'A1', 5, 4),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Como se diz "goodbye"?', 'multiple_choice', '["Olá", "Adeus", "Bom dia", "Boa noite"]', 'Adeus', 'Adeus é usado para se despedir.', 'A1', 5, 5),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Completa: "_____ dia!"', 'fill_blank', NULL, 'Bom', 'Bom dia é o cumprimento matinal.', 'A1', 5, 6),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Qual é o artigo definido masculino?', 'multiple_choice', '["A", "O", "Os", "As"]', 'O', 'O é o artigo definido masculino singular.', 'A1', 5, 7),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Como se diz "water"?', 'multiple_choice', '["Leite", "Água", "Café", "Chá"]', 'Água', 'Água é water em português.', 'A1', 5, 8),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Completa: "Eu quero _____ café."', 'fill_blank', NULL, 'um', 'Um é o artigo indefinido masculino.', 'A1', 5, 9),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Como se pergunta o nome?', 'multiple_choice', '["Qual é o seu nome?", "Como está?", "Onde mora?", "Quantos anos tem?"]', 'Qual é o seu nome?', 'Esta é a forma educada de perguntar o nome.', 'A1', 5, 10);

-- Spanish exercises for "Introducción al Español" (Coffee Break Spanish)
INSERT INTO exercises (id, episode_id, question, exercise_type, options, correct_answer, explanation, difficulty, xp_reward, order_index) VALUES
(gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', '¿Cómo se dice "hello" en español?', 'multiple_choice', '["Adiós", "Hola", "Gracias", "Por favor"]', 'Hola', 'Hola es la forma más común de saludar en español.', 'A1', 5, 1),
(gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Completa: "Yo _____ español."', 'fill_blank', NULL, 'hablo', 'El verbo "hablar" se usa para expressar que hablas un idioma.', 'A1', 5, 2),
(gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', '¿Cuál es la respuesta a "¿Cómo estás?"', 'multiple_choice', '["Gracias", "Estoy bien", "Por favor", "Lo siento"]', 'Estoy bien', 'Estoy bien es la respuesta estándar para "¿Cómo estás?".', 'A1', 5, 3),
(gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Verdadero o falso: "Gracias" significa "please".', 'multiple_choice', '["Verdadero", "Falso"]', 'Falso', 'Gracias significa "thank you", no "please".', 'A1', 5, 4),
(gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', '¿Cómo se dice "goodbye"?', 'multiple_choice', '["Hola", "Adiós", "Buenos días", "Buenas noches"]', 'Adiós', 'Adiós se usa para despedirse.', 'A1', 5, 5),
(gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Completa: "¡_____ días!"', 'fill_blank', NULL, 'Buenos', 'Buenos días es el saludo matutino.', 'A1', 5, 6),
(gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', '¿Cuál es el artículo definido masculino?', 'multiple_choice', '["La", "El", "Los", "Las"]', 'El', 'El es el artículo definido masculino singular.', 'A1', 5, 7),
(gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', '¿Cómo se dice "water"?', 'multiple_choice', '["Leche", "Agua", "Café", "Té"]', 'Agua', 'Agua es water en español.', 'A1', 5, 8),
(gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Completa: "Yo quiero _____ café."', 'fill_blank', NULL, 'un', 'Un es el artículo indefinido masculino.', 'A1', 5, 9),
(gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', '¿Cómo se pregunta el nombre?', 'multiple_choice', '["¿Cuál es tu nombre?", "¿Cómo estás?", "¿Dónde vives?", "¿Cuántos años tienes?"]', '¿Cuál es tu nombre?', 'Esta es la forma educada de preguntar el nombre.', 'A1', 5, 10);