-- Track monthly distinct library video unlocks for students
CREATE TABLE IF NOT EXISTS public.student_library_video_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  source text NOT NULL DEFAULT 'library',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id, month_start)
);

ALTER TABLE public.student_library_video_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own library unlocks" ON public.student_library_video_unlocks;
CREATE POLICY "Users can view own library unlocks"
ON public.student_library_video_unlocks
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own library unlocks" ON public.student_library_video_unlocks;
CREATE POLICY "Users can insert own library unlocks"
ON public.student_library_video_unlocks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage library unlocks" ON public.student_library_video_unlocks;
CREATE POLICY "Service role can manage library unlocks"
ON public.student_library_video_unlocks
FOR ALL
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE INDEX IF NOT EXISTS idx_student_library_unlocks_user_month
  ON public.student_library_video_unlocks(user_id, month_start);

CREATE INDEX IF NOT EXISTS idx_student_library_unlocks_video
  ON public.student_library_video_unlocks(video_id);

CREATE OR REPLACE FUNCTION public.enforce_student_library_video_access(
  p_video_id uuid,
  p_scene_index integer DEFAULT NULL,
  p_is_assignment boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_month_start date;
  v_monthly_limit integer := 15;
  v_scene_limit integer := 3;
  v_unlocked_count integer := 0;
  v_already_unlocked boolean := false;
  v_is_premium boolean := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'auth_required'
    );
  END IF;

  IF p_is_assignment THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'is_assignment', true,
      'reason', 'teacher_assignment'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = v_user_id
      AND s.status = 'active'
      AND s.tier IN ('premium', 'promo')
      AND (s.expires_at IS NULL OR s.expires_at > now())
  ) INTO v_is_premium;

  IF v_is_premium THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'is_premium', true,
      'monthly_limit', -1,
      'scene_limit', -1
    );
  END IF;

  v_month_start := date_trunc('month', timezone('utc', now()))::date;

  IF p_scene_index IS NOT NULL AND p_scene_index >= v_scene_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'scene_limit_reached',
      'scene_limit', v_scene_limit
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.student_library_video_unlocks slu
    WHERE slu.user_id = v_user_id
      AND slu.video_id = p_video_id
      AND slu.month_start = v_month_start
  ) INTO v_already_unlocked;

  IF v_already_unlocked THEN
    SELECT COUNT(*)::integer
    FROM public.student_library_video_unlocks slu
    WHERE slu.user_id = v_user_id
      AND slu.month_start = v_month_start
    INTO v_unlocked_count;

    RETURN jsonb_build_object(
      'allowed', true,
      'already_unlocked', true,
      'monthly_unlocked_count', v_unlocked_count,
      'monthly_limit', v_monthly_limit,
      'scene_limit', v_scene_limit
    );
  END IF;

  SELECT COUNT(*)::integer
  FROM public.student_library_video_unlocks slu
  WHERE slu.user_id = v_user_id
    AND slu.month_start = v_month_start
  INTO v_unlocked_count;

  IF v_unlocked_count >= v_monthly_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'monthly_video_limit_reached',
      'monthly_unlocked_count', v_unlocked_count,
      'monthly_limit', v_monthly_limit,
      'scene_limit', v_scene_limit
    );
  END IF;

  INSERT INTO public.student_library_video_unlocks (user_id, video_id, month_start, source)
  VALUES (v_user_id, p_video_id, v_month_start, 'library')
  ON CONFLICT (user_id, video_id, month_start) DO NOTHING;

  RETURN jsonb_build_object(
    'allowed', true,
    'already_unlocked', false,
    'monthly_unlocked_count', v_unlocked_count + 1,
    'monthly_limit', v_monthly_limit,
    'scene_limit', v_scene_limit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_student_library_video_access(uuid, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_student_library_video_access(uuid, integer, boolean) TO authenticated;
