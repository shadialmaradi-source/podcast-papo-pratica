-- Add the specific Italian podcast from Spotify
INSERT INTO podcast_sources (
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
  'Italian History & Culture',
  'Discover the fascinating stories of Italian history, culture, and television through engaging episodes',
  'https://feeds.buzzsprout.com/italianhistory.rss',
  'italian',
  'History & Culture',
  'B2',
  3,
  true,
  'https://i.scdn.co/image/ab6765630000ba8a123456789abcdef123456789'
);

-- Get the podcast ID we just inserted
DO $$
DECLARE
    podcast_id uuid;
    episode_tv_id uuid;
BEGIN
    -- Get the podcast ID
    SELECT id INTO podcast_id FROM podcast_sources WHERE title = 'Italian History & Culture' AND language = 'italian';
    
    -- Add 10 episodes for this podcast
    INSERT INTO podcast_episodes (
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
    ) VALUES 
    -- Episode 1: Italian TV History (this will have exercises)
    (
      podcast_id,
      'The Golden Age of Italian Television',
      'Explore the revolutionary period of Italian television from the 1950s to 1980s and its impact on society',
      'https://open.spotify.com/episode/2Bsahki3KpC8BzY2R9PObY',
      'https://anchor.fm/s/italian-tv/podcast/play/2Bsahki3KpC8BzY2R9PObY/audio.mp3',
      2400,
      '2024-01-15 10:00:00+00',
      'In questa puntata, esploreremo l''età d''oro della televisione italiana, un periodo rivoluzionario che ha trasformato la società italiana...',
      'italian',
      1,
      1
    ),
    -- Episode 2
    (
      podcast_id,
      'Renaissance Masters and Their Legacy',
      'Journey through the Renaissance period and discover how Italian masters shaped world art',
      'https://open.spotify.com/episode/3Ctyhli4LqD9CzZ3S0QOcZ',
      'https://anchor.fm/s/italian-history/podcast/play/3Ctyhli4LqD9CzZ3S0QOcZ/audio.mp3',
      2100,
      '2024-01-22 10:00:00+00',
      'Il Rinascimento italiano ha prodotto alcuni dei più grandi artisti della storia...',
      'italian',
      2,
      1
    ),
    -- Episode 3
    (
      podcast_id,
      'The Roman Empire: From Rise to Fall',
      'Discover the fascinating history of ancient Rome and its lasting influence',
      'https://open.spotify.com/episode/4Duzhkj5MrE0DaA4T1RPdA',
      'https://anchor.fm/s/italian-history/podcast/play/4Duzhkj5MrE0DaA4T1RPdA/audio.mp3',
      2700,
      '2024-01-29 10:00:00+00',
      'L''Impero Romano è stata una delle civiltà più influenti della storia...',
      'italian',
      3,
      1
    ),
    -- Episode 4
    (
      podcast_id,
      'Italian Cinema: Neorealism and Beyond',
      'Explore the evolution of Italian cinema from neorealism to modern masterpieces',
      'https://open.spotify.com/episode/5Evaikl6NsF1EbB5U2SQeB',
      'https://anchor.fm/s/italian-history/podcast/play/5Evaikl6NsF1EbB5U2SQeB/audio.mp3',
      2300,
      '2024-02-05 10:00:00+00',
      'Il cinema italiano ha rivoluzionato l''arte cinematografica mondiale...',
      'italian',
      4,
      1
    ),
    -- Episode 5
    (
      podcast_id,
      'The Venetian Republic: Maritime Power',
      'Learn about the powerful Venetian Republic and its maritime empire',
      'https://open.spotify.com/episode/6Fvbjlm7OtG2FcC6V3TRfC',
      'https://anchor.fm/s/italian-history/podcast/play/6Fvbjlm7OtG2FcC6V3TRfC/audio.mp3',
      2500,
      '2024-02-12 10:00:00+00',
      'La Repubblica di Venezia fu una delle potenze marittime più importanti...',
      'italian',
      5,
      1
    ),
    -- Episode 6
    (
      podcast_id,
      'Italian Unification: The Risorgimento',
      'Discover the process of Italian unification in the 19th century',
      'https://open.spotify.com/episode/7Gwclmn8PuH3GdD7W4USgD',
      'https://anchor.fm/s/italian-history/podcast/play/7Gwclmn8PuH3GdD7W4USgD/audio.mp3',
      2600,
      '2024-02-19 10:00:00+00',
      'Il Risorgimento è stato il processo di unificazione dell''Italia...',
      'italian',
      6,
      1
    ),
    -- Episode 7
    (
      podcast_id,
      'The Medici Family: Patrons of the Arts',
      'Explore the influential Medici family and their impact on Renaissance culture',
      'https://open.spotify.com/episode/8Hxdnmo9QvI4HeE8X5VThE',
      'https://anchor.fm/s/italian-history/podcast/play/8Hxdnmo9QvI4HeE8X5VThE/audio.mp3',
      2200,
      '2024-02-26 10:00:00+00',
      'La famiglia de'' Medici ha dominato Firenze per secoli...',
      'italian',
      7,
      1
    ),
    -- Episode 8
    (
      podcast_id,
      'The Papal States: Religion and Politics',
      'Understand the role of the Papal States in Italian history',
      'https://open.spotify.com/episode/9Iydkon0RwJ5IfF9Y6WUiF',
      'https://anchor.fm/s/italian-history/podcast/play/9Iydkon0RwJ5IfF9Y6WUiF/audio.mp3',
      2400,
      '2024-03-05 10:00:00+00',
      'Lo Stato Pontificio ha giocato un ruolo cruciale nella storia italiana...',
      'italian',
      8,
      1
    ),
    -- Episode 9
    (
      podcast_id,
      'Italian Resistance in World War II',
      'Learn about the brave Italian resistance movement during WWII',
      'https://open.spotify.com/episode/0Jzelmp1SxK6JgG0Z7XViG',
      'https://anchor.fm/s/italian-history/podcast/play/0Jzelmp1SxK6JgG0Z7XViG/audio.mp3',
      2800,
      '2024-03-12 10:00:00+00',
      'La Resistenza italiana è stata un movimento di opposizione all''occupazione nazista...',
      'italian',
      9,
      1
    ),
    -- Episode 10
    (
      podcast_id,
      'Modern Italy: From Republic to EU',
      'Explore Italy''s journey from monarchy to republic and European integration',
      'https://open.spotify.com/episode/1Kaeloq2TyL7KhH1A8YWjH',
      'https://anchor.fm/s/italian-history/podcast/play/1Kaeloq2TyL7KhH1A8YWjH/audio.mp3',
      2350,
      '2024-03-19 10:00:00+00',
      'L''Italia moderna ha attraversato trasformazioni significative...',
      'italian',
      10,
      1
    );

    -- Get the TV episode ID
    SELECT id INTO episode_tv_id FROM podcast_episodes WHERE title = 'The Golden Age of Italian Television' AND podcast_source_id = podcast_id;

    -- Add exercises specifically for the Italian TV History episode
    INSERT INTO exercises (
      episode_id,
      question,
      exercise_type,
      options,
      correct_answer,
      explanation,
      difficulty,
      xp_reward,
      order_index
    ) VALUES 
    (
      episode_tv_id,
      'In che periodo è avvenuta l''età d''oro della televisione italiana?',
      'multiple_choice',
      '["1940s-1960s", "1950s-1980s", "1960s-1990s", "1970s-2000s"]',
      '1950s-1980s',
      'L''età d''oro della televisione italiana va dagli anni ''50 agli anni ''80, quando la TV ha trasformato la società italiana.',
      'B2',
      15,
      1
    ),
    (
      episode_tv_id,
      'Quale fu il primo canale televisivo nazionale italiano?',
      'multiple_choice',
      '["Canale 5", "RAI 1", "Italia 1", "Rete 4"]',
      'RAI 1',
      'RAI 1 fu il primo canale televisivo nazionale italiano, iniziando le trasmissioni regolari nel 1954.',
      'B2',
      15,
      2
    ),
    (
      episode_tv_id,
      'La televisione italiana ha contribuito a unificare linguisticamente il paese.',
      'true_false',
      '["Vero", "Falso"]',
      'Vero',
      'La televisione ha avuto un ruolo fondamentale nell''unificazione linguistica dell''Italia, diffondendo l''italiano standard.',
      'B1',
      10,
      3
    ),
    (
      episode_tv_id,
      'Chi fu il famoso conduttore televisivo italiano noto come "il Re della TV"?',
      'multiple_choice',
      '["Mike Bongiorno", "Pippo Baudo", "Corrado", "Raimondo Vianello"]',
      'Mike Bongiorno',
      'Mike Bongiorno fu soprannominato "il Re della TV" per la sua lunga carriera e popolarità nella televisione italiana.',
      'B2',
      15,
      4
    ),
    (
      episode_tv_id,
      'Completa la frase: "La televisione italiana ha trasformato le _____ sociali del paese."',
      'fill_blank',
      '["abitudini", "tradizioni", "usanze", "costumi"]',
      'abitudini',
      'La televisione ha trasformato le abitudini sociali degli italiani, cambiando i ritmi di vita quotidiana.',
      'B1',
      12,
      5
    ),
    (
      episode_tv_id,
      'Quale programma televisivo italiano è famoso per aver lanciato molti cantanti?',
      'multiple_choice',
      '["Sanremo", "Canzonissima", "Studio Uno", "Tutti insieme"]',
      'Sanremo',
      'Il Festival di Sanremo è il programma più famoso per aver lanciato cantanti italiani dal 1951.',
      'B2',
      15,
      6
    ),
    (
      episode_tv_id,
      'La televisione a colori arrivò in Italia negli anni ''70.',
      'true_false',
      '["Vero", "Falso"]',
      'Vero',
      'La televisione a colori iniziò ufficialmente in Italia nel 1977, relativamente tardi rispetto ad altri paesi europei.',
      'B1',
      10,
      7
    ),
    (
      episode_tv_id,
      'Quale impatto sociale ha avuto la televisione sulle famiglie italiane?',
      'multiple_choice',
      '["Ha isolato le persone", "Ha riunito le famiglie la sera", "Ha ridotto i dialoghi", "Ha eliminato le tradizioni"]',
      'Ha riunito le famiglie la sera',
      'La televisione è diventata il centro della vita familiare italiana, riunendo le famiglie attorno al televisore la sera.',
      'B2',
      15,
      8
    ),
    (
      episode_tv_id,
      'Traduci in italiano: "Television changed Italian society"',
      'translation',
      '["La televisione ha cambiato la società italiana", "La TV trasformò l''Italia", "La televisione modificò la società"]',
      'La televisione ha cambiato la società italiana',
      'Traduzione corretta che mantiene il significato originale usando il passato prossimo.',
      'B1',
      12,
      9
    ),
    (
      episode_tv_id,
      'Quale fu l''importanza culturale della televisione italiana negli anni ''60?',
      'multiple_choice',
      '["Diffuse la cultura americana", "Preservò le tradizioni locali", "Educò la popolazione", "Promosse solo l''intrattenimento"]',
      'Educò la popolazione',
      'Negli anni ''60 la televisione italiana ebbe un ruolo educativo fondamentale, alfabetizzando e istruendo la popolazione.',
      'B2',
      15,
      10
    );
END $$;