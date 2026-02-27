
-- Add native_language column to youtube_exercises
ALTER TABLE public.youtube_exercises ADD COLUMN native_language TEXT DEFAULT 'en';

-- Set existing rows to 'en'
UPDATE public.youtube_exercises SET native_language = 'en' WHERE native_language IS NULL;

-- Update the RPC function to accept native_language_param
CREATE OR REPLACE FUNCTION public.get_youtube_exercises_with_answers(video_id_param uuid, difficulty_param text DEFAULT NULL::text, native_language_param text DEFAULT 'en'::text)
 RETURNS TABLE(id uuid, video_id uuid, question text, exercise_type text, options jsonb, difficulty text, intensity text, xp_reward integer, order_index integer, context_sentence text, vocabulary_words jsonb, correct_answer text, explanation text, question_translation text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT 
    e.id,
    e.video_id,
    e.question,
    e.exercise_type,
    e.options,
    e.difficulty,
    e.intensity,
    e.xp_reward,
    e.order_index,
    e.context_sentence,
    e.vocabulary_words,
    e.correct_answer,
    e.explanation,
    e.question_translation
  FROM public.youtube_exercises e
  WHERE e.video_id = video_id_param
    AND (difficulty_param IS NULL OR e.difficulty = difficulty_param)
    AND e.native_language = native_language_param
  ORDER BY e.order_index;
END;
$function$;
