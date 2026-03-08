
-- Trigger function to enforce lesson limits per teacher plan
CREATE OR REPLACE FUNCTION public.enforce_teacher_lesson_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan TEXT;
  v_limit INTEGER;
  v_count INTEGER;
  v_start_of_month TIMESTAMPTZ;
BEGIN
  -- Get teacher's plan
  SELECT plan INTO v_plan
  FROM public.teacher_subscriptions
  WHERE teacher_id = NEW.teacher_id
  LIMIT 1;

  v_plan := COALESCE(v_plan, 'free');

  -- Determine limit
  v_limit := CASE v_plan
    WHEN 'free' THEN 10
    WHEN 'pro' THEN 60
    WHEN 'premium' THEN 160
    ELSE 10
  END;

  -- Count lessons this month
  v_start_of_month := date_trunc('month', now());

  SELECT COUNT(*) INTO v_count
  FROM public.teacher_lessons
  WHERE teacher_id = NEW.teacher_id
    AND created_at >= v_start_of_month;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'LESSON_LIMIT_REACHED:You have reached your % plan limit of % lessons this month.', v_plan, v_limit;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER enforce_lesson_limit
BEFORE INSERT ON public.teacher_lessons
FOR EACH ROW
EXECUTE FUNCTION public.enforce_teacher_lesson_limit();
