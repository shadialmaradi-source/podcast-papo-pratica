-- Align teacher lesson caps with frontend pricing/quota
CREATE OR REPLACE FUNCTION public.enforce_teacher_lesson_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan TEXT;
  v_status TEXT;
  v_trial_ends_at TIMESTAMPTZ;
  v_limit INTEGER;
  v_count INTEGER;
  v_start_of_month TIMESTAMPTZ;
BEGIN
  SELECT plan, status, trial_ends_at INTO v_plan, v_status, v_trial_ends_at
  FROM public.teacher_subscriptions
  WHERE teacher_id = NEW.teacher_id
  LIMIT 1;

  v_plan := COALESCE(v_plan, 'free');
  v_status := COALESCE(v_status, 'active');

  IF v_plan = 'trial' AND v_trial_ends_at IS NOT NULL AND v_trial_ends_at < now() THEN
    RAISE EXCEPTION 'TRIAL_EXPIRED:Your 14-day free trial has ended. Please upgrade to continue creating lessons.';
  END IF;

  IF v_status = 'past_due' THEN
    RAISE EXCEPTION 'PAYMENT_PAST_DUE:Your payment is past due. Please update your payment method.';
  END IF;

  v_limit := CASE v_plan
    WHEN 'free' THEN 10
    WHEN 'trial' THEN 30
    WHEN 'pro' THEN 30
    WHEN 'premium' THEN 100
    ELSE 10
  END;

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
$function$;

-- Enforce teacher student slot limit in backend (free tier only)
CREATE OR REPLACE FUNCTION public.enforce_teacher_student_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan TEXT;
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  SELECT plan INTO v_plan
  FROM public.teacher_subscriptions
  WHERE teacher_id = NEW.teacher_id
  LIMIT 1;

  v_plan := COALESCE(v_plan, 'free');
  v_limit := CASE v_plan
    WHEN 'free' THEN 3
    ELSE NULL
  END;

  IF v_limit IS NULL OR NEW.status = 'archived' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.teacher_students
  WHERE teacher_id = NEW.teacher_id
    AND status <> 'archived'
    AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'STUDENT_LIMIT_REACHED:You have reached your % plan limit of % active students.', v_plan, v_limit;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_teacher_student_limit_trigger ON public.teacher_students;
CREATE TRIGGER enforce_teacher_student_limit_trigger
BEFORE INSERT OR UPDATE ON public.teacher_students
FOR EACH ROW
EXECUTE FUNCTION public.enforce_teacher_student_limit();

-- Block new video assignments when trial expired or payment is past due
CREATE OR REPLACE FUNCTION public.enforce_teacher_assignment_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan TEXT;
  v_status TEXT;
  v_trial_ends_at TIMESTAMPTZ;
BEGIN
  SELECT plan, status, trial_ends_at INTO v_plan, v_status, v_trial_ends_at
  FROM public.teacher_subscriptions
  WHERE teacher_id = NEW.teacher_id
  LIMIT 1;

  v_plan := COALESCE(v_plan, 'free');
  v_status := COALESCE(v_status, 'active');

  IF v_plan = 'trial' AND v_trial_ends_at IS NOT NULL AND v_trial_ends_at < now() THEN
    RAISE EXCEPTION 'TRIAL_EXPIRED:Your 14-day free trial has ended. Please upgrade to continue assigning content.';
  END IF;

  IF v_status = 'past_due' THEN
    RAISE EXCEPTION 'PAYMENT_PAST_DUE:Your payment is past due. Please update your payment method.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_teacher_assignment_limit_trigger ON public.video_assignments;
CREATE TRIGGER enforce_teacher_assignment_limit_trigger
BEFORE INSERT ON public.video_assignments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_teacher_assignment_limit();
