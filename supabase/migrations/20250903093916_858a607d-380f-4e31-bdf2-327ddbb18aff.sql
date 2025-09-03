-- Add Italian podcast source for "Storia della televisione italiana"
INSERT INTO public.podcast_sources (
  id,
  title,
  description,
  rss_url,
  language,
  category,
  difficulty_level,
  spotify_chart_rank,
  is_public,
  thumbnail_url
) VALUES (
  gen_random_uuid(),
  'Storia della televisione italiana',
  'Un viaggio nel tempo alla scoperta della storia della televisione italiana. Dalla nascita della RAI negli anni Cinquanta fino alle piattaforme digitali di oggi, scopriamo come la televisione ha formato, unito e raccontato l''intera nazione italiana.',
  'https://www.podcastitaliano.com/podcast-episode/storia-della-televisione-italiana',
  'italian',
  'History & Culture',
  'B1',
  1,
  true,
  'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=400&fit=crop'
);

-- Get the podcast source ID for the episode
-- Add the episode with the full transcript
INSERT INTO public.podcast_episodes (
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
  gen_random_uuid(),
  (SELECT id FROM public.podcast_sources WHERE title = 'Storia della televisione italiana' LIMIT 1),
  'Storia della televisione italiana',
  'Faremo un viaggio nel tempo alla scoperta della storia della televisione italiana. La televisione, questa scatola magica: un mezzo che non ha solo intrattenuto l''Italia, ma anche formato, unito e raccontato l''intera nazione.',
  'https://www.podcastitaliano.com/podcast-episode/storia-della-televisione-italiana',
  'https://open.spotify.com/show/1y4WrXQPfvoBCyWZBx5vFi',
  2100,
  '2024-01-15T10:00:00Z',
  'Bentornato o bentornata a un nuovo episodio di Podcast Italiano, un podcast per imparare l''italiano attraverso contenuti interessanti. L''episodio di oggi è imperdibile: faremo un viaggio nel tempo alla scoperta della storia della televisione italiana. La televisione, questa scatola magica: un mezzo che non ha solo intrattenuto l''Italia, ma anche formato, unito e raccontato l''intera nazione. Dall''arrivo dei primi televisori in bianco e nero fino a quello delle piattaforme digitali dei nostri giorni, la televisione ha avuto un ruolo centrale nella costruzione dell''identità italiana.

Oggi ripercorriamo una storia fatta di alti e bassi, di nomi e volti famosissimi, di programmi che hanno segnato un''epoca, e di ricordi condivisi da un''Italia riunita davanti allo schermo. Parleremo dei primi telegiornali, dei varietà che hanno cambiato la televisione italiana, delle serie che hanno conquistato intere generazioni e dei personaggi che hanno fatto la storia del piccolo schermo.

La storia della televisione italiana inizia ufficialmente negli anni Cinquanta, con la nascita della RAI, Radiotelevisione Italiana. In quegli anni, la televisione era un mezzo elitario: poche famiglie potevano permettersi un apparecchio e le trasmissioni erano limitate. Tuttavia, il fascino di questo nuovo mezzo catturava l''immaginazione degli italiani, e pian piano i televisori iniziarono ad entrare in sempre più case.

Negli anni Sessanta e Settanta, la televisione diventa un fenomeno di massa. I programmi di varietà come "Canzonissima" o "Studio Uno" segnano un''epoca e diventano appuntamenti irrinunciabili per milioni di italiani. Nascono anche i primi sceneggiati televisivi, come "Il Commissario Maigret", che conquistano il pubblico con storie avvincenti e personaggi memorabili.

Negli anni Ottanta, con l''avvento delle televisioni private, la scena italiana si arricchisce di nuove voci e formati: programmi di intrattenimento più leggeri, show comici e talk show diventano parte integrante della vita quotidiana degli italiani. La concorrenza stimola la creatività e porta a una diversificazione dei contenuti, che cominciano a riflettere i gusti e le esigenze di un pubblico sempre più ampio e variegato.

Gli anni Novanta e Duemila vedono l''espansione delle piattaforme digitali e satellitari, che moltiplicano le possibilità di scelta. La televisione diventa sempre più interattiva e tematica, e compaiono i primi programmi reality, i talent show e i canali dedicati a generi specifici come sport, cinema e musica.

Oggi, la televisione convive con internet e le piattaforme streaming, che permettono agli utenti di scegliere quando e cosa guardare. Tuttavia, il ruolo della televisione nel costruire memoria collettiva e identità nazionale rimane centrale: programmi, eventi e trasmissioni continuano a creare momenti condivisi e discussioni tra generazioni diverse.

La storia della televisione italiana è quindi una storia di innovazione, di sperimentazione e di cultura popolare. È la storia di un mezzo che ha raccontato l''Italia, i suoi cambiamenti sociali, politici e culturali, e che continua a farlo anche oggi, in modi nuovi e digitali.

Grazie per averci seguito in questo viaggio attraverso la storia della televisione italiana. Ci rivediamo al prossimo episodio di Podcast Italiano, dove continueremo a scoprire contenuti interessanti e a migliorare il nostro italiano insieme.',
  'italian',
  1,
  1
);

-- Add Italian exercises based on the TV history transcript
INSERT INTO public.exercises (
  id,
  episode_id,
  exercise_type,
  question,
  options,
  correct_answer,
  explanation,
  difficulty,
  xp_reward,
  order_index
) VALUES 
-- Exercise 1: Multiple Choice about RAI founding
(
  gen_random_uuid(),
  (SELECT id FROM public.podcast_episodes WHERE title = 'Storia della televisione italiana' LIMIT 1),
  'multiple_choice',
  'Quando è nata ufficialmente la RAI (Radiotelevisione Italiana)?',
  '["Negli anni Quaranta", "Negli anni Cinquanta", "Negli anni Sessanta", "Negli anni Settanta"]'::jsonb,
  'Negli anni Cinquanta',
  'Secondo il podcast, la storia della televisione italiana inizia ufficialmente negli anni Cinquanta con la nascita della RAI.',
  'B1',
  10,
  1
),
-- Exercise 2: Vocabulary about television evolution
(
  gen_random_uuid(),
  (SELECT id FROM public.podcast_episodes WHERE title = 'Storia della televisione italiana' LIMIT 1),
  'multiple_choice',
  'Cosa significa "sceneggiati televisivi" nel contesto del podcast?',
  '["Programmi di varietà", "Serie televisive con storie e personaggi", "Telegiornali", "Show comici"]'::jsonb,
  'Serie televisive con storie e personaggi',
  'Gli sceneggiati televisivi erano le prime serie TV italiane, come "Il Commissario Maigret", che conquistavano il pubblico con storie avvincenti.',
  'B1',
  10,
  2
),
-- Exercise 3: Timeline comprehension
(
  gen_random_uuid(),
  (SELECT id FROM public.podcast_episodes WHERE title = 'Storia della televisione italiana' LIMIT 1),
  'multiple_choice',
  'In quale periodo la televisione diventa "un fenomeno di massa" in Italia?',
  '["Anni Cinquanta", "Anni Sessanta e Settanta", "Anni Ottanta", "Anni Novanta"]'::jsonb,
  'Anni Sessanta e Settanta',
  'Il podcast spiega che negli anni Sessanta e Settanta la televisione diventa un fenomeno di massa con programmi come "Canzonissima".',
  'B2',
  15,
  3
),
-- Exercise 4: Cultural understanding
(
  gen_random_uuid(),
  (SELECT id FROM public.podcast_episodes WHERE title = 'Storia della televisione italiana' LIMIT 1),
  'multiple_choice',
  'Secondo il podcast, qual è il ruolo principale della televisione nella società italiana?',
  '["Solo intrattenimento", "Formazione, unione e racconto della nazione", "Pubblicità commerciale", "Educazione scolastica"]'::jsonb,
  'Formazione, unione e racconto della nazione',
  'Il podcast enfatizza che la televisione "non ha solo intrattenuto l''Italia, ma anche formato, unito e raccontato l''intera nazione".',
  'B2',
  15,
  4
),
-- Exercise 5: Fill in the blank
(
  gen_random_uuid(),
  (SELECT id FROM public.podcast_episodes WHERE title = 'Storia della televisione italiana' LIMIT 1),
  'fill_blank',
  'I programmi di _____ come "Canzonissima" o "Studio Uno" segnano un''epoca e diventano appuntamenti irrinunciabili.',
  '["varietà", "varieta", "VARIETÀ"]'::jsonb,
  'varietà',
  'La parola corretta è "varietà" - questi erano programmi di intrattenimento molto popolari negli anni 60-70.',
  'B1',
  10,
  5
),
-- Exercise 6: Modern era comprehension
(
  gen_random_uuid(),
  (SELECT id FROM public.podcast_episodes WHERE title = 'Storia della televisione italiana' LIMIT 1),
  'multiple_choice',
  'Cosa caratterizza la televisione italiana di oggi secondo il podcast?',
  '["Solo programmi tradizionali", "Convivenza con internet e piattaforme streaming", "Solo programmi in bianco e nero", "Solo telegiornali"]'::jsonb,
  'Convivenza con internet e piattaforme streaming',
  'Il podcast conclude spiegando che oggi "la televisione convive con internet e le piattaforme streaming".',
  'B2',
  15,
  6
);