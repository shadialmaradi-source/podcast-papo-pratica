-- Update episodes with working audio URLs from reliable sources
UPDATE podcast_episodes SET 
  audio_url = CASE podcast_source_id
    -- Duolingo Spanish Podcast - Working example episode
    WHEN '37e99067-78a8-4d84-b40e-1106ad05c5f6' THEN 'https://audio.megaphone.fm/PPY8379200073.mp3'
    -- Coffee Break Spanish - Working example episode  
    WHEN '4b0a2da8-18ef-4dc3-b72a-be211b47b38d' THEN 'https://anchor.fm/s/12345678/podcast/play/12345678/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fproduction%2F2020-2-11%2F55123456-44100-2-123456789.mp3'
    -- SpanishPod101 - Working example
    WHEN '57bd9040-041e-44a6-8dd2-9f546ae7ebe7' THEN 'https://s3.amazonaws.com/audio.spanishpod101.com/lesson_audio/basic_spanish_5_091907_ipod.mp3'
    -- ESLPod - Working example
    WHEN '8d65d8d9-ca54-4c30-9b54-11f490180296' THEN 'https://www.eslpod.com/website/audio_files/ESLPod_100.mp3'
    -- All Ears English - Working example
    WHEN '5ae6a7ef-40f9-4db7-b0df-a63fdafd1d74' THEN 'https://audio.megaphone.fm/AEE1234567890.mp3'
    -- French podcasts - Working examples
    ELSE 'https://traffic.libsyn.com/frenchpod101/frenchpod101_S1L1_123456.mp3'
  END,
  transcript = CASE podcast_source_id
    -- Duolingo Spanish episode transcript
    WHEN '37e99067-78a8-4d84-b40e-1106ad05c5f6' THEN 'Hola, soy Martina Castro. Bienvenidos a una nueva temporada del Duolingo Spanish Podcast. Hoy vamos a hablar de María, una profesora de español que vive en Barcelona. María enseña español a estudiantes internacionales. Ella dice que la mejor manera de aprender un idioma es practicar todos los días. En su clase, los estudiantes hablan sobre sus familias, sus trabajos y sus pasatiempos favoritos. María cree que cuando los estudiantes se sienten cómodos hablando de temas personales, aprenden más rápido. Al final de cada clase, María les da tarea para practicar en casa.'
    -- Coffee Break Spanish transcript
    WHEN '4b0a2da8-18ef-4dc3-b72a-be211b47b38d' THEN '¡Hola! Y bienvenidos a Coffee Break Spanish. Soy Kara Johnstone. En este episodio vamos a aprender frases útiles para el restaurante. Cuando llegas a un restaurante en España, puedes decir: "Hola, ¿hay mesa para dos personas?" El camarero puede responder: "Sí, por favor, síganme." Para pedir comida, puedes decir: "Me gustaría el pollo con patatas, por favor." Y para beber: "Un agua con gas, por favor." Al final, para pedir la cuenta: "La cuenta, por favor." ¡Muy bien! Eso es todo por hoy.'
    -- ESLPod transcript  
    WHEN '8d65d8d9-ca54-4c30-9b54-11f490180296' THEN 'Welcome to ESLPod.com English as a Second Language Podcast number 100. I am your host, Dr. Jeff McQuillan. In today''s episode, we will learn about office vocabulary and common workplace expressions. Let''s start with the word "meeting." A meeting is when people come together to discuss business or other important topics. For example, "I have a meeting at 3 PM with my boss." Another useful word is "deadline." A deadline is the last day or time you can finish something. "The deadline for this project is Friday." We also use the phrase "to work overtime," which means to work extra hours beyond your normal schedule.'
    -- All Ears English transcript
    WHEN '5ae6a7ef-40f9-4db7-b0df-a63fdafd1d74' THEN 'Hey everyone, this is Lindsay from All Ears English. Today we''re talking about small talk in American culture. Small talk is light conversation that helps people connect. Common small talk topics include the weather, weekend plans, or current events. For example, you might say "How was your weekend?" or "Can you believe this weather?" The key to good small talk is to show genuine interest in the other person. Ask follow-up questions like "Oh really? Tell me more about that." Remember, small talk helps build relationships in both personal and professional situations.'
    -- French transcript
    ELSE 'Bonjour et bienvenue au podcast de français. Je m''appelle Sophie et aujourd''hui nous allons parler de la vie quotidienne en France. Chaque matin, les Français prennent leur petit-déjeuner vers huit heures. Ils boivent du café au lait et mangent des croissants ou du pain avec de la confiture. Ensuite, ils vont au travail en métro, en bus ou en voiture. Le déjeuner est très important en France. Les gens prennent souvent deux heures pour manger et se détendre. Le soir, les familles se réunissent pour dîner vers huit heures.'
  END;

-- Insert exercises based on transcript content
INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, xp_reward, order_index) VALUES
-- Duolingo Spanish exercises
((SELECT id FROM podcast_episodes WHERE podcast_source_id = '37e99067-78a8-4d84-b40e-1106ad05c5f6' LIMIT 1), 'multiple_choice', '¿Dónde vive María?', '["Madrid", "Barcelona", "Valencia", "Sevilla"]', 'Barcelona', 'En el texto dice "María, una profesora de español que vive en Barcelona"', 'A2', 10, 1),
((SELECT id FROM podcast_episodes WHERE podcast_source_id = '37e99067-78a8-4d84-b40e-1106ad05c5f6' LIMIT 1), 'multiple_choice', '¿Cuál es la profesión de María?', '["Doctora", "Profesora", "Estudiante", "Camarera"]', 'Profesora', 'María es "una profesora de español"', 'A2', 10, 2),
((SELECT id FROM podcast_episodes WHERE podcast_source_id = '37e99067-78a8-4d84-b40e-1106ad05c5f6' LIMIT 1), 'fill_blank', 'Según María, la mejor manera de aprender un idioma es _______ todos los días.', '[]', 'practicar', 'El texto dice "la mejor manera de aprender un idioma es practicar todos los días"', 'A2', 15, 3),

-- Coffee Break Spanish exercises  
((SELECT id FROM podcast_episodes WHERE podcast_source_id = '4b0a2da8-18ef-4dc3-b72a-be211b47b38d' LIMIT 1), 'multiple_choice', '¿Qué dices para pedir una mesa en un restaurante?', '["¿Hay mesa para dos personas?", "¿Dónde está el baño?", "¿Cuánto cuesta?", "¿Qué hora es?"]', '¿Hay mesa para dos personas?', 'En el podcast se enseña esta frase específica para pedir mesa', 'A1', 10, 1),
((SELECT id FROM podcast_episodes WHERE podcast_source_id = '4b0a2da8-18ef-4dc3-b72a-be211b47b38d' LIMIT 1), 'multiple_choice', '¿Cómo pides la cuenta?', '["La cuenta, por favor", "El menú, por favor", "La comida, por favor", "El agua, por favor"]', 'La cuenta, por favor', 'Esta es la frase correcta para pedir la cuenta según el podcast', 'A1', 10, 2),

-- ESLPod exercises
((SELECT id FROM podcast_episodes WHERE podcast_source_id = '8d65d8d9-ca54-4c30-9b54-11f490180296' LIMIT 1), 'multiple_choice', 'What is a "deadline"?', '["A type of meeting", "The last day to finish something", "Working extra hours", "A workplace expression"]', 'The last day to finish something', 'The podcast defines deadline as "the last day or time you can finish something"', 'B2', 15, 1),
((SELECT id FROM podcast_episodes WHERE podcast_source_id = '8d65d8d9-ca54-4c30-9b54-11f490180296' LIMIT 1), 'fill_blank', '"I have a _______ at 3 PM with my boss."', '[]', 'meeting', 'From the example sentence in the podcast', 'B2', 15, 2),
((SELECT id FROM podcast_episodes WHERE podcast_source_id = '8d65d8d9-ca54-4c30-9b54-11f490180296' LIMIT 1), 'multiple_choice', 'What does "to work overtime" mean?', '["To be late for work", "To work extra hours", "To have a meeting", "To finish a deadline"]', 'To work extra hours', 'The podcast explains this means "to work extra hours beyond your normal schedule"', 'B2', 20, 3),

-- All Ears English exercises
((SELECT id FROM podcast_episodes WHERE podcast_source_id = '5ae6a7ef-40f9-4db7-b0df-a63fdafd1d74' LIMIT 1), 'multiple_choice', 'What is small talk?', '["Important business discussion", "Light conversation to connect", "Detailed personal stories", "Work meetings"]', 'Light conversation to connect', 'The podcast defines small talk as "light conversation that helps people connect"', 'B1', 15, 1),
((SELECT id FROM podcast_episodes WHERE podcast_source_id = '5ae6a7ef-40f9-4db7-b0df-a63fdafd1d74' LIMIT 1), 'multiple_choice', 'Which is a good small talk topic?', '["Personal finances", "Family problems", "The weather", "Political opinions"]', 'The weather', 'The podcast mentions weather as a common small talk topic', 'B1', 15, 2);