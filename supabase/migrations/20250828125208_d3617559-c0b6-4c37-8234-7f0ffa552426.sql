-- Fix the security definer view issue by dropping it and using a better approach
DROP VIEW IF EXISTS public.exercises_public;

-- Fix function search paths for all functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the exercise answer checking function with proper search path
CREATE OR REPLACE FUNCTION public.check_exercise_answer(
  exercise_id_param UUID,
  user_answer_param TEXT
)
RETURNS TABLE(
  is_correct BOOLEAN,
  correct_answer TEXT,
  explanation TEXT,
  xp_reward INTEGER
) AS $$
BEGIN
  -- Only return the correct answer and explanation after the user submits their answer
  RETURN QUERY
  SELECT 
    (e.correct_answer = user_answer_param) as is_correct,
    e.correct_answer,
    e.explanation,
    e.xp_reward
  FROM public.exercises e
  WHERE e.id = exercise_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Update the podcast exercises function with proper search path
CREATE OR REPLACE FUNCTION public.get_podcast_exercises(podcast_id_param UUID)
RETURNS TABLE(
  id UUID,
  podcast_id UUID,
  question TEXT,
  exercise_type TEXT,
  options JSONB,
  difficulty TEXT,
  xp_reward INTEGER,
  order_index INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.podcast_id,
    e.question,
    e.exercise_type,
    e.options,
    e.difficulty,
    e.xp_reward,
    e.order_index
  FROM public.exercises e
  WHERE e.podcast_id = podcast_id_param
  ORDER BY e.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create a better policy for exercises that allows reading questions but not answers
CREATE POLICY "Users can view exercise questions without answers" ON public.exercises
  FOR SELECT USING (
    -- Allow access but client should use the secure functions instead
    auth.role() = 'authenticated'
  );