
-- Update trigger to use hardcoded Supabase URL for pg_net call
CREATE OR REPLACE FUNCTION public.notify_teacher_assignment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student_name TEXT;
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

    -- Insert in-app notification
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

    -- Send email notification via edge function
    BEGIN
      PERFORM net.http_post(
        url := 'https://fezpzihnvblzjrdzgioq.supabase.co/functions/v1/notify-teacher-email',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlenB6aWhudmJsempyZHpnaW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODExNjksImV4cCI6MjA3MTk1NzE2OX0.LKxauwcMH0HaT-DeoBNG5mH7rneI8OiyfSQGrYG1R4M"}'::jsonb,
        body := jsonb_build_object(
          'teacher_id', NEW.teacher_id,
          'student_email', NEW.student_email,
          'student_name', v_student_name,
          'assignment_title', COALESCE(NEW.video_title, 'Untitled'),
          'assignment_type', NEW.assignment_type
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify-teacher-email call failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;
