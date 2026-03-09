
-- Add trial tracking fields to teacher_subscriptions
ALTER TABLE teacher_subscriptions 
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE;

-- Index for efficient trial expiry checks
CREATE INDEX IF NOT EXISTS idx_teacher_trial_expiry ON teacher_subscriptions(trial_ends_at) 
WHERE trial_ends_at IS NOT NULL;

-- Update enforce_teacher_lesson_limit to recognize 'trial' plan
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
  -- Get teacher's plan, status, and trial end date
  SELECT plan, status, trial_ends_at INTO v_plan, v_status, v_trial_ends_at
  FROM public.teacher_subscriptions
  WHERE teacher_id = NEW.teacher_id
  LIMIT 1;

  v_plan := COALESCE(v_plan, 'free');
  v_status := COALESCE(v_status, 'active');

  -- Block if trial expired
  IF v_plan = 'trial' AND v_trial_ends_at IS NOT NULL AND v_trial_ends_at < now() THEN
    RAISE EXCEPTION 'TRIAL_EXPIRED:Your 14-day free trial has ended. Please upgrade to continue creating lessons.';
  END IF;

  -- Block if past_due
  IF v_status = 'past_due' THEN
    RAISE EXCEPTION 'PAYMENT_PAST_DUE:Your payment is past due. Please update your payment method.';
  END IF;

  -- Determine limit (trial gets pro limits)
  v_limit := CASE v_plan
    WHEN 'free' THEN 10
    WHEN 'trial' THEN 60
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
$function$;
