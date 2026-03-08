
-- Update the existing trigger function to also call the email notification edge function via pg_net
CREATE OR REPLACE FUNCTION public.notify_teacher_assignment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student_name TEXT;
  v_supabase_url TEXT;
  v_anon_key TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Look up student name
    SELECT student_name INTO v_student_name
    FROM public.teacher_students
    WHERE teacher_id = NEW.teacher_id
      AND student_email = NEW.student_email
    LIMIT 1;

    IF v_student_name IS NULL THEN
      v_student_name := NEW.student_email;
    END IF;

    -- Insert in-app notification (existing behavior)
    INSERT INTO public.teacher_notifications (
      teacher_id, type, title, message, video_id, student_email
    ) VALUES (
      NEW.teacher_id,
      'assignment_completed',
      'Assignment Completed',
      v_student_name || ' completed "' || COALESCE(NEW.video_title, 'Untitled') || '"',
      NEW.video_id,
      NEW.student_email
    );

    -- Send email notification via edge function using pg_net
    BEGIN
      v_supabase_url := current_setting('app.settings.supabase_url', true);
      v_anon_key := current_setting('app.settings.anon_key', true);

      IF v_supabase_url IS NOT NULL AND v_anon_key IS NOT NULL THEN
        PERFORM net.http_post(
          url := v_supabase_url || '/functions/v1/notify-teacher-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key
          ),
          body := jsonb_build_object(
            'teacher_id', NEW.teacher_id,
            'student_email', NEW.student_email,
            'student_name', v_student_name,
            'assignment_title', COALESCE(NEW.video_title, 'Untitled'),
            'assignment_type', NEW.assignment_type
          )
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Don't fail the trigger if email sending fails
      RAISE WARNING 'notify-teacher-email call failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;
