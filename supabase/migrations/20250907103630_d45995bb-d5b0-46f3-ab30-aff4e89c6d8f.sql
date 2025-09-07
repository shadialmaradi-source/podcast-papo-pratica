-- Update the check_exercise_answer function to handle new exercise types
CREATE OR REPLACE FUNCTION public.check_exercise_answer(exercise_id_param uuid, user_answer_param text)
 RETURNS TABLE(is_correct boolean, correct_answer text, explanation text, xp_reward integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  exercise_rec RECORD;
  user_answer_json jsonb;
  correct_answer_json jsonb;
  is_answer_correct boolean := false;
  i integer;
  match_count integer := 0;
  total_pairs integer := 0;
BEGIN
  -- Get exercise details
  SELECT e.exercise_type, e.correct_answer, e.explanation, e.xp_reward, e.options
  INTO exercise_rec
  FROM public.exercises e
  WHERE e.id = exercise_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ''::text, 'Exercise not found'::text, 0;
    RETURN;
  END IF;
  
  -- Check answer based on exercise type
  CASE exercise_rec.exercise_type
    WHEN 'multiple_choice' THEN
      is_answer_correct := (exercise_rec.correct_answer = user_answer_param);
      
    WHEN 'true_false' THEN
      is_answer_correct := (exercise_rec.correct_answer = user_answer_param);
      
    WHEN 'gap_fill' THEN
      is_answer_correct := (exercise_rec.correct_answer = user_answer_param);
      
    WHEN 'matching' THEN
      -- Parse JSON answers for matching pairs
      BEGIN
        user_answer_json := user_answer_param::jsonb;
        correct_answer_json := exercise_rec.correct_answer::jsonb;
        
        -- Count total pairs expected
        SELECT jsonb_array_length(correct_answer_json) INTO total_pairs;
        
        -- Count matching pairs
        FOR i IN 0..(total_pairs - 1) LOOP
          IF (user_answer_json->i) = (correct_answer_json->i) THEN
            match_count := match_count + 1;
          END IF;
        END LOOP;
        
        is_answer_correct := (match_count = total_pairs);
      EXCEPTION WHEN OTHERS THEN
        is_answer_correct := false;
      END;
      
    WHEN 'sequencing' THEN
      -- Compare ordered arrays
      BEGIN
        user_answer_json := user_answer_param::jsonb;
        correct_answer_json := exercise_rec.correct_answer::jsonb;
        is_answer_correct := (user_answer_json = correct_answer_json);
      EXCEPTION WHEN OTHERS THEN
        is_answer_correct := false;
      END;
      
    ELSE
      -- Fallback for other types
      is_answer_correct := (exercise_rec.correct_answer = user_answer_param);
  END CASE;
  
  RETURN QUERY 
  SELECT 
    is_answer_correct,
    exercise_rec.correct_answer,
    exercise_rec.explanation,
    exercise_rec.xp_reward;
END;
$function$;