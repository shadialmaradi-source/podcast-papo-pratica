-- Remove existing exercises for Storia della televisione italiana
DELETE FROM exercises WHERE episode_id IN (
  SELECT id FROM podcast_episodes WHERE title = 'Storia della televisione italiana'
);

-- Insert 10 comprehensive exercises for Storia della televisione italiana episode
INSERT INTO exercises (episode_id, exercise_type, question, options, correct_answer, explanation, difficulty, order_index, xp_reward) VALUES
-- Episode ID will be the same as before
((SELECT id FROM podcast_episodes WHERE title = 'Storia della televisione italiana'), 'multiple_choice', 'Quando è stata fondata la RAI?', '["1924", "1936", "1945", "1950"]', '1924', 'La RAI (Radiotelevisioni Italiane) è stata fondata nel 1924, inizialmente come URI (Unione Radiofonica Italiana).', 'B1', 1, 15),

((SELECT id FROM podcast_episodes WHERE title = 'Storia della televisione italiana'), 'multiple_choice', 'Quale programma televisivo ha dominato gli anni ''80 in Italia?', '["Canzonissima", "Drive In", "Portobello", "Fantastico"]', 'Drive In', 'Drive In è stato uno dei programmi più influenti degli anni ''80, contribuendo al successo di Mediaset.', 'B1', 2, 15),

((SELECT id FROM podcast_episodes WHERE title = 'Storia della televisione italiana'), 'vocabulary', 'Cosa significa "sceneggiato" nel contesto televisivo italiano?', '["Un programma di varietà", "Una fiction drammatica", "Un quiz show", "Un programma musicale"]', 'Una fiction drammatica', 'Gli sceneggiati erano produzioni televisive drammatiche molto popolari negli anni ''60 e ''70.', 'B2', 3, 20),

((SELECT id FROM podcast_episodes WHERE title = 'Storia della televisione italiana'), 'fill_blank', 'La televisione italiana ha avuto un ruolo fondamentale nell''_______ del paese nel dopoguerra.', NULL, 'unificazione', 'La TV ha contribuito all''unificazione linguistica e culturale dell''Italia.', 'B2', 4, 20),

((SELECT id FROM podcast_episodes WHERE title = 'Storia della televisione italiana'), 'multiple_choice', 'Quando è iniziata la televisione a colori in Italia?', '["1972", "1975", "1977", "1980"]', '1977', 'Le trasmissioni televisive a colori sono iniziate ufficialmente in Italia nel 1977.', 'B1', 5, 15),

((SELECT id FROM podcast_episodes WHERE title = 'Storia della televisione italiana'), 'vocabulary', 'Cosa sono le "reti commerciali" nella televisione italiana?', '["Canali pubblici", "Canali privati", "Canali regionali", "Canali satellitari"]', 'Canali privati', 'Le reti commerciali sono i canali televisivi privati, principalmente Mediaset, nati negli anni ''80.', 'B2', 6, 20),

((SELECT id FROM podcast_episodes WHERE title = 'Storia della televisione italiana'), 'true_false', 'Mike Bongiorno è considerato il pioniere della televisione italiana.', NULL, 'true', 'Mike Bongiorno è infatti considerato uno dei pionieri della televisione italiana, conducendo programmi storici come "Lascia o raddoppia?".', 'B1', 7, 15),

((SELECT id FROM podcast_episodes WHERE title = 'Storia della televisione italiana'), 'fill_blank', 'Il programma "_______ o raddoppia?" è stato uno dei quiz più famosi della TV italiana.', NULL, 'Lascia', 'Lascia o raddoppia è stato un programma iconico condotto da Mike Bongiorno.', 'B1', 8, 15),

((SELECT id FROM podcast_episodes WHERE title = 'Storia della televisione italiana'), 'multiple_choice', 'Quale evento ha segnato l''inizio dell''era digitale per la TV italiana?', '["L''arrivo di Sky", "Il digitale terrestre", "Internet TV", "La TV satellitare"]', 'Il digitale terrestre', 'Il passaggio al digitale terrestre negli anni 2000 ha rivoluzionato la televisione italiana.', 'B2', 9, 20),

((SELECT id FROM podcast_episodes WHERE title = 'Storia della televisione italiana'), 'vocabulary', 'Cosa significa "Carosello" nella storia della televisione italiana?', '["Un programma per bambini", "Pubblicità televisiva", "Un varietà musicale", "Un telegiornale"]', 'Pubblicità televisiva', 'Carosello era il celebre programma pubblicitario che andava in onda ogni sera prima del TG.', 'B2', 10, 20);