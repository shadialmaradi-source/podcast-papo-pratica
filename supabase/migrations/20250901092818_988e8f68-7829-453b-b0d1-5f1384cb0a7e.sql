-- Create table for podcast sources (RSS feeds)
CREATE TABLE public.podcast_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  rss_url TEXT NOT NULL,
  language TEXT NOT NULL,
  category TEXT,
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  spotify_chart_rank INTEGER,
  is_public BOOLEAN DEFAULT true,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for podcast episodes
CREATE TABLE public.podcast_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  podcast_source_id UUID NOT NULL REFERENCES public.podcast_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  episode_url TEXT NOT NULL,
  audio_url TEXT,
  duration INTEGER, -- duration in seconds
  publish_date TIMESTAMP WITH TIME ZONE,
  transcript TEXT, -- full transcript for exercise generation
  transcript_language TEXT,
  episode_number INTEGER,
  season_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update exercises table to link to episodes instead of podcasts
ALTER TABLE public.exercises 
DROP COLUMN podcast_id,
ADD COLUMN episode_id UUID REFERENCES public.podcast_episodes(id) ON DELETE CASCADE;

-- Update user_exercise_results to track episodes
ALTER TABLE public.user_exercise_results
DROP COLUMN podcast_id,
ADD COLUMN episode_id UUID REFERENCES public.podcast_episodes(id) ON DELETE CASCADE;

-- Update user_podcast_progress to track episodes
ALTER TABLE public.user_podcast_progress
RENAME TO user_episode_progress;

ALTER TABLE public.user_episode_progress
DROP COLUMN podcast_id,
ADD COLUMN episode_id UUID REFERENCES public.podcast_episodes(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_podcast_sources_language ON public.podcast_sources(language);
CREATE INDEX idx_podcast_sources_difficulty ON public.podcast_sources(difficulty_level);
CREATE INDEX idx_podcast_episodes_source ON public.podcast_episodes(podcast_source_id);
CREATE INDEX idx_exercises_episode ON public.exercises(episode_id);

-- Enable RLS on new tables
ALTER TABLE public.podcast_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for podcast sources (public readable)
CREATE POLICY "Podcast sources are viewable by everyone" 
ON public.podcast_sources 
FOR SELECT 
USING (is_public = true);

-- Create RLS policies for podcast episodes (public readable)
CREATE POLICY "Episodes are viewable by everyone" 
ON public.podcast_episodes 
FOR SELECT 
USING (true);

-- Update triggers for new tables
CREATE TRIGGER update_podcast_sources_updated_at
BEFORE UPDATE ON public.podcast_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_podcast_episodes_updated_at
BEFORE UPDATE ON public.podcast_episodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample podcast sources for different languages
INSERT INTO public.podcast_sources (title, description, rss_url, language, category, difficulty_level, spotify_chart_rank, thumbnail_url) VALUES
('Duolingo Spanish Podcast', 'Real-life stories in simple Spanish', 'https://feeds.megaphone.fm/duolingospanishpodcast', 'spanish', 'Education', 'A2', 1, '/podcast-thumbs/duolingo-spanish.jpg'),
('Coffee Break Spanish', 'Quick Spanish lessons for busy people', 'https://feeds.megaphone.fm/coffeebreakspanish', 'spanish', 'Education', 'A1', 2, '/podcast-thumbs/coffee-break-spanish.jpg'),
('SpanishPod101', 'Learn Spanish with SpanishPod101', 'https://feeds.feedburner.com/spanishpod101', 'spanish', 'Education', 'B1', 3, '/podcast-thumbs/spanishpod101.jpg'),

('ESLPod', 'English as a Second Language Podcast', 'https://feeds.feedburner.com/eslpod', 'english', 'Education', 'B2', 1, '/podcast-thumbs/eslpod.jpg'),
('All Ears English', 'Real English conversations', 'https://feeds.megaphone.fm/allearsenglish', 'english', 'Education', 'B1', 2, '/podcast-thumbs/all-ears-english.jpg'),
('The English We Speak', 'Learn authentic English expressions', 'https://podcasts.files.bbci.co.uk/p02pc9zn.rss', 'english', 'Education', 'A2', 3, '/podcast-thumbs/english-we-speak.jpg'),

('PortuguesePod101', 'Learn Portuguese with PortuguesePod101', 'https://feeds.feedburner.com/portuguesepod101', 'portuguese', 'Education', 'A1', 1, '/podcast-thumbs/portuguesepod101.jpg'),
('Fala Brasil', 'Portuguese language and culture', 'https://feeds.transistor.fm/fala-brasil', 'portuguese', 'Education', 'A2', 2, '/podcast-thumbs/fala-brasil.jpg'),
('Conversa Brasileira', 'Authentic Brazilian conversations', 'https://feeds.feedburner.com/conversabrasileira', 'portuguese', 'Education', 'B1', 3, '/podcast-thumbs/conversa-brasileira.jpg'),

('FrenchPod101', 'Learn French with FrenchPod101', 'https://feeds.feedburner.com/frenchpod101', 'french', 'Education', 'A1', 1, '/podcast-thumbs/frenchpod101.jpg'),
('Coffee Break French', 'Quick French lessons', 'https://feeds.megaphone.fm/coffeebreakfrench', 'french', 'Education', 'A2', 2, '/podcast-thumbs/coffee-break-french.jpg'),
('News in Slow French', 'Current events at a slower pace', 'https://feeds.feedburner.com/newsinslowfrench', 'french', 'Education', 'B2', 3, '/podcast-thumbs/news-slow-french.jpg');

-- Update the existing database functions to work with episodes
DROP FUNCTION IF EXISTS public.get_podcast_exercises(UUID);
DROP FUNCTION IF EXISTS public.check_exercise_answer(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_episode_exercises(episode_id_param UUID)
RETURNS TABLE(
  id UUID, 
  episode_id UUID, 
  question TEXT, 
  exercise_type TEXT, 
  options JSONB, 
  difficulty TEXT, 
  xp_reward INTEGER, 
  order_index INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.episode_id,
    e.question,
    e.exercise_type,
    e.options,
    e.difficulty,
    e.xp_reward,
    e.order_index
  FROM public.exercises e
  WHERE e.episode_id = episode_id_param
  ORDER BY e.order_index;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_exercise_answer(exercise_id_param UUID, user_answer_param TEXT)
RETURNS TABLE(
  is_correct BOOLEAN, 
  correct_answer TEXT, 
  explanation TEXT, 
  xp_reward INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (e.correct_answer = user_answer_param) as is_correct,
    e.correct_answer,
    e.explanation,
    e.xp_reward
  FROM public.exercises e
  WHERE e.id = exercise_id_param;
END;
$$;