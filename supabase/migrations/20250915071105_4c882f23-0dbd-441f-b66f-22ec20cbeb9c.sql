-- Create vocabulary management tables
CREATE TABLE public.vocabulary_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  translation TEXT,
  definition TEXT NOT NULL,
  language TEXT NOT NULL,
  difficulty_level TEXT NOT NULL DEFAULT 'beginner',
  frequency_rank INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user vocabulary progress tracking
CREATE TABLE public.user_vocabulary_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  word_id UUID NOT NULL REFERENCES public.vocabulary_words(id),
  episode_id UUID REFERENCES public.podcast_episodes(id),
  mastery_level INTEGER NOT NULL DEFAULT 0,
  times_seen INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  last_review_date TIMESTAMP WITH TIME ZONE,
  next_review_date TIMESTAMP WITH TIME ZONE,
  is_learned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create spaced repetition system table
CREATE TABLE public.spaced_repetition_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  word_id UUID NOT NULL REFERENCES public.vocabulary_words(id),
  review_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  difficulty_rating INTEGER NOT NULL CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  response_time INTEGER, -- in milliseconds
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor DECIMAL(3,2) NOT NULL DEFAULT 2.50,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced exercises table with new types
ALTER TABLE public.exercises 
ADD COLUMN vocabulary_words JSONB,
ADD COLUMN context_sentence TEXT,
ADD COLUMN audio_url TEXT,
ADD COLUMN image_url TEXT;

-- Enable Row Level Security
ALTER TABLE public.vocabulary_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vocabulary_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaced_repetition_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vocabulary_words
CREATE POLICY "Vocabulary words are viewable by everyone" 
ON public.vocabulary_words 
FOR SELECT 
USING (true);

-- Create RLS policies for user_vocabulary_progress
CREATE POLICY "Users can view their own vocabulary progress" 
ON public.user_vocabulary_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vocabulary progress" 
ON public.user_vocabulary_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabulary progress" 
ON public.user_vocabulary_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for spaced_repetition_reviews
CREATE POLICY "Users can view their own SRS reviews" 
ON public.spaced_repetition_reviews 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SRS reviews" 
ON public.spaced_repetition_reviews 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_vocabulary_words_language ON public.vocabulary_words(language);
CREATE INDEX idx_vocabulary_words_difficulty ON public.vocabulary_words(difficulty_level);
CREATE INDEX idx_user_vocabulary_progress_user_word ON public.user_vocabulary_progress(user_id, word_id);
CREATE INDEX idx_user_vocabulary_progress_next_review ON public.user_vocabulary_progress(next_review_date);
CREATE INDEX idx_spaced_repetition_reviews_user_word ON public.spaced_repetition_reviews(user_id, word_id);

-- Create function to update vocabulary progress
CREATE OR REPLACE FUNCTION public.update_vocabulary_progress(
  p_user_id UUID,
  p_word_id UUID,
  p_is_correct BOOLEAN,
  p_difficulty_rating INTEGER DEFAULT 3
)
RETURNS VOID AS $$
DECLARE
  v_progress RECORD;
  v_new_interval INTEGER;
  v_new_ease_factor DECIMAL(3,2);
BEGIN
  -- Get or create vocabulary progress
  SELECT * INTO v_progress
  FROM public.user_vocabulary_progress
  WHERE user_id = p_user_id AND word_id = p_word_id;
  
  IF NOT FOUND THEN
    -- Create new progress record
    INSERT INTO public.user_vocabulary_progress (
      user_id, word_id, mastery_level, times_seen, times_correct,
      last_review_date, next_review_date
    ) VALUES (
      p_user_id, p_word_id, 0, 1, 
      CASE WHEN p_is_correct THEN 1 ELSE 0 END,
      now(), 
      now() + INTERVAL '1 day'
    );
    
    v_new_interval := 1;
    v_new_ease_factor := 2.50;
  ELSE
    -- Update existing progress using spaced repetition algorithm
    IF p_is_correct THEN
      v_new_interval := CASE 
        WHEN v_progress.mastery_level = 0 THEN 1
        WHEN v_progress.mastery_level = 1 THEN 6
        ELSE CEIL(v_progress.mastery_level * 2.5)::INTEGER
      END;
      
      v_new_ease_factor := GREATEST(1.30, 
        2.50 + (0.1 - (5 - p_difficulty_rating) * (0.08 + (5 - p_difficulty_rating) * 0.02))
      );
      
      UPDATE public.user_vocabulary_progress SET
        mastery_level = mastery_level + 1,
        times_seen = times_seen + 1,
        times_correct = times_correct + 1,
        last_review_date = now(),
        next_review_date = now() + (v_new_interval || ' days')::INTERVAL,
        is_learned = (mastery_level + 1) >= 5,
        updated_at = now()
      WHERE user_id = p_user_id AND word_id = p_word_id;
    ELSE
      -- Reset on incorrect answer
      UPDATE public.user_vocabulary_progress SET
        mastery_level = 0,
        times_seen = times_seen + 1,
        last_review_date = now(),
        next_review_date = now() + INTERVAL '1 day',
        is_learned = false,
        updated_at = now()
      WHERE user_id = p_user_id AND word_id = p_word_id;
      
      v_new_interval := 1;
      v_new_ease_factor := GREATEST(1.30, v_progress.mastery_level * 0.8);
    END IF;
  END IF;
  
  -- Record the review
  INSERT INTO public.spaced_repetition_reviews (
    user_id, word_id, difficulty_rating, interval_days, 
    ease_factor, is_correct
  ) VALUES (
    p_user_id, p_word_id, p_difficulty_rating, v_new_interval,
    v_new_ease_factor, p_is_correct
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to get vocabulary due for review
CREATE OR REPLACE FUNCTION public.get_vocabulary_due_for_review(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE(
  word_id UUID,
  word TEXT,
  definition TEXT,
  translation TEXT,
  language TEXT,
  mastery_level INTEGER,
  times_seen INTEGER,
  next_review_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vw.id,
    vw.word,
    vw.definition,
    vw.translation,
    vw.language,
    uvp.mastery_level,
    uvp.times_seen,
    uvp.next_review_date
  FROM public.vocabulary_words vw
  JOIN public.user_vocabulary_progress uvp ON vw.id = uvp.word_id
  WHERE uvp.user_id = p_user_id 
    AND uvp.next_review_date <= now()
    AND uvp.is_learned = false
  ORDER BY uvp.next_review_date ASC, uvp.mastery_level ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger for vocabulary_words updated_at
CREATE TRIGGER update_vocabulary_words_updated_at
  BEFORE UPDATE ON public.vocabulary_words
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for user_vocabulary_progress updated_at  
CREATE TRIGGER update_user_vocabulary_progress_updated_at
  BEFORE UPDATE ON public.user_vocabulary_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();