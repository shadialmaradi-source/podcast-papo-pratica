-- Add sample episodes for existing podcast sources
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
)
SELECT 
  ps.id,
  CASE 
    WHEN ps.language = 'portuguese' THEN 'Episódio ' || (row_number() OVER (PARTITION BY ps.id ORDER BY ps.id)) || ': ' || ps.title
    WHEN ps.language = 'spanish' THEN 'Episodio ' || (row_number() OVER (PARTITION BY ps.id ORDER BY ps.id)) || ': ' || ps.title
    WHEN ps.language = 'french' THEN 'Épisode ' || (row_number() OVER (PARTITION BY ps.id ORDER BY ps.id)) || ': ' || ps.title
    WHEN ps.language = 'german' THEN 'Folge ' || (row_number() OVER (PARTITION BY ps.id ORDER BY ps.id)) || ': ' || ps.title
    ELSE 'Episode ' || (row_number() OVER (PARTITION BY ps.id ORDER BY ps.id)) || ': ' || ps.title
  END as title,
  CASE 
    WHEN ps.language = 'portuguese' THEN 'Um episódio interessante sobre ' || lower(ps.category) || '. Aprenda vocabulário útil e melhore suas habilidades de escuta.'
    WHEN ps.language = 'spanish' THEN 'Un episodio interesante sobre ' || lower(ps.category) || '. Aprende vocabulario útil y mejora tus habilidades de escucha.'
    WHEN ps.language = 'french' THEN 'Un épisode intéressant sur ' || lower(ps.category) || '. Apprenez du vocabulaire utile et améliorez vos compétences d''écoute.'
    WHEN ps.language = 'german' THEN 'Eine interessante Folge über ' || lower(ps.category) || '. Lernen Sie nützliche Vokabeln und verbessern Sie Ihre Hörfähigkeiten.'
    ELSE 'An interesting episode about ' || lower(ps.category) || '. Learn useful vocabulary and improve your listening skills.'
  END as description,
  'https://example.com/episode/' || ps.id || '/1' as episode_url,
  '/audio/sample-episode.mp3' as audio_url,
  1800 + (random() * 1200)::int as duration, -- 30-50 minutes
  now() - interval '1 day' * (row_number() OVER (PARTITION BY ps.id ORDER BY ps.id)) as publish_date,
  CASE 
    WHEN ps.language = 'portuguese' THEN 'Bem-vindos ao nosso podcast de aprendizado de português. Hoje vamos falar sobre temas interessantes que vão ajudar você a melhorar seu vocabulário e compreensão. Durante este episódio, você vai ouvir conversas naturais, expressões úteis e dicas práticas para usar no dia a dia.'
    WHEN ps.language = 'spanish' THEN 'Bienvenidos a nuestro podcast de aprendizaje de español. Hoy vamos a hablar sobre temas interesantes que te ayudarán a mejorar tu vocabulario y comprensión. Durante este episodio, escucharás conversaciones naturales, expresiones útiles y consejos prácticos para usar en el día a día.'
    WHEN ps.language = 'french' THEN 'Bienvenue dans notre podcast d''apprentissage du français. Aujourd''hui, nous allons parler de sujets intéressants qui vous aideront à améliorer votre vocabulaire et votre compréhension. Pendant cet épisode, vous entendrez des conversations naturelles, des expressions utiles et des conseils pratiques à utiliser au quotidien.'
    WHEN ps.language = 'german' THEN 'Willkommen zu unserem Deutsch-Lernpodcast. Heute sprechen wir über interessante Themen, die Ihnen helfen, Ihren Wortschatz und Ihr Verständnis zu verbessern. In dieser Folge hören Sie natürliche Gespräche, nützliche Ausdrücke und praktische Tipps für den Alltag.'
    ELSE 'Welcome to our language learning podcast. Today we will talk about interesting topics that will help you improve your vocabulary and comprehension. During this episode, you will hear natural conversations, useful expressions, and practical tips for everyday use.'
  END as transcript,
  ps.language as transcript_language,
  row_number() OVER (PARTITION BY ps.id ORDER BY ps.id) as episode_number,
  1 as season_number
FROM podcast_sources ps
WHERE ps.is_public = true
ORDER BY ps.id;

-- Add a second episode for each podcast
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
)
SELECT 
  ps.id,
  CASE 
    WHEN ps.language = 'portuguese' THEN 'Episódio 2: Conversas do Cotidiano'
    WHEN ps.language = 'spanish' THEN 'Episodio 2: Conversaciones Cotidianas'
    WHEN ps.language = 'french' THEN 'Épisode 2: Conversations Quotidiennes'
    WHEN ps.language = 'german' THEN 'Folge 2: Alltägliche Gespräche'
    ELSE 'Episode 2: Everyday Conversations'
  END as title,
  CASE 
    WHEN ps.language = 'portuguese' THEN 'Aprenda frases e expressões comuns usadas em conversas do dia a dia. Este episódio é perfeito para melhorar sua fluência.'
    WHEN ps.language = 'spanish' THEN 'Aprende frases y expresiones comunes usadas en conversaciones del día a día. Este episodio es perfecto para mejorar tu fluidez.'
    WHEN ps.language = 'french' THEN 'Apprenez les phrases et expressions courantes utilisées dans les conversations quotidiennes. Cet épisode est parfait pour améliorer votre fluidité.'
    WHEN ps.language = 'german' THEN 'Lernen Sie häufige Phrasen und Ausdrücke aus alltäglichen Gesprächen. Diese Folge ist perfekt, um Ihre Sprachgewandtheit zu verbessern.'
    ELSE 'Learn common phrases and expressions used in everyday conversations. This episode is perfect for improving your fluency.'
  END as description,
  'https://example.com/episode/' || ps.id || '/2' as episode_url,
  '/audio/sample-episode-2.mp3' as audio_url,
  1600 + (random() * 1000)::int as duration, -- 26-43 minutes
  now() - interval '2 days' as publish_date,
  CASE 
    WHEN ps.language = 'portuguese' THEN 'Neste segundo episódio, vamos explorar conversas típicas do cotidiano. Você vai aprender como se expressar em situações comuns como no supermercado, no trabalho, e com amigos. Preste atenção às entonações e ao ritmo natural da fala.'
    WHEN ps.language = 'spanish' THEN 'En este segundo episodio, exploraremos conversaciones típicas del día a día. Aprenderás cómo expresarte en situaciones comunes como en el supermercado, en el trabajo, y con amigos. Presta atención a las entonaciones y al ritmo natural del habla.'
    WHEN ps.language = 'french' THEN 'Dans ce deuxième épisode, nous explorerons les conversations typiques du quotidien. Vous apprendrez à vous exprimer dans des situations courantes comme au supermarché, au travail, et avec des amis. Faites attention aux intonations et au rythme naturel de la parole.'
    WHEN ps.language = 'german' THEN 'In dieser zweiten Folge erkunden wir typische Alltagsgespräche. Sie lernen, sich in alltäglichen Situationen auszudrücken, wie im Supermarkt, bei der Arbeit und mit Freunden. Achten Sie auf die Betonungen und den natürlichen Sprachrhythmus.'
    ELSE 'In this second episode, we will explore typical everyday conversations. You will learn how to express yourself in common situations like at the supermarket, at work, and with friends. Pay attention to the intonations and natural rhythm of speech.'
  END as transcript,
  ps.language as transcript_language,
  2 as episode_number,
  1 as season_number
FROM podcast_sources ps
WHERE ps.is_public = true
ORDER BY ps.id;