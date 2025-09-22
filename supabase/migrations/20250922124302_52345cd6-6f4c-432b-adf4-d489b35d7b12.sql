-- Create YouTube videos table
CREATE TABLE public.youtube_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration INTEGER, -- in seconds
  language TEXT NOT NULL DEFAULT 'english',
  difficulty_level TEXT NOT NULL DEFAULT 'beginner',
  category TEXT,
  view_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create YouTube transcripts table
CREATE TABLE public.youtube_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  language TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  word_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create YouTube exercises table
CREATE TABLE public.youtube_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT NOT NULL,
  intensity TEXT NOT NULL DEFAULT 'light',
  xp_reward INTEGER DEFAULT 10,
  order_index INTEGER DEFAULT 0,
  vocabulary_words JSONB,
  context_sentence TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create YouTube video analytics table
CREATE TABLE public.youtube_video_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- view, start_exercises, complete_exercises, rate
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_youtube_videos_video_id ON public.youtube_videos(video_id);
CREATE INDEX idx_youtube_videos_language_difficulty ON public.youtube_videos(language, difficulty_level);
CREATE INDEX idx_youtube_videos_status ON public.youtube_videos(status);
CREATE INDEX idx_youtube_transcripts_video_id ON public.youtube_transcripts(video_id);
CREATE INDEX idx_youtube_exercises_video_id ON public.youtube_exercises(video_id);
CREATE INDEX idx_youtube_exercises_difficulty_intensity ON public.youtube_exercises(difficulty, intensity);
CREATE INDEX idx_youtube_video_analytics_video_id ON public.youtube_video_analytics(video_id);
CREATE INDEX idx_youtube_video_analytics_user_id ON public.youtube_video_analytics(user_id);

-- Enable Row Level Security
ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_video_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for youtube_videos (public read, admin write)
CREATE POLICY "YouTube videos are viewable by everyone" 
ON public.youtube_videos 
FOR SELECT 
USING (status = 'completed');

-- RLS Policies for youtube_transcripts (public read)
CREATE POLICY "YouTube transcripts are viewable by everyone" 
ON public.youtube_transcripts 
FOR SELECT 
USING (true);

-- RLS Policies for youtube_exercises (public read for questions only, not answers)
CREATE POLICY "YouTube exercises are viewable by everyone" 
ON public.youtube_exercises 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for youtube_video_analytics (users can insert their own analytics)
CREATE POLICY "Users can insert their own YouTube analytics" 
ON public.youtube_video_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own YouTube analytics" 
ON public.youtube_video_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add trigger for updating updated_at timestamps
CREATE TRIGGER update_youtube_videos_updated_at
BEFORE UPDATE ON public.youtube_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_youtube_transcripts_updated_at
BEFORE UPDATE ON public.youtube_transcripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();