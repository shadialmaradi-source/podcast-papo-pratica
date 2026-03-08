
-- Create teacher_notifications table
CREATE TABLE public.teacher_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  video_id TEXT,
  student_email TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_teacher_notifications_teacher ON public.teacher_notifications(teacher_id, read, created_at DESC);

-- RLS
ALTER TABLE public.teacher_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own notifications"
  ON public.teacher_notifications FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can update own notifications"
  ON public.teacher_notifications FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid());

-- Trigger function (SECURITY DEFINER so it can INSERT bypassing RLS)
CREATE OR REPLACE FUNCTION public.notify_teacher_assignment_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to video_assignments
CREATE TRIGGER trigger_notify_teacher_completion
  AFTER UPDATE ON public.video_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_teacher_assignment_completed();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_notifications;

-- Add notification_preferences to teacher_profiles
ALTER TABLE public.teacher_profiles
  ADD COLUMN notification_preferences JSONB DEFAULT '{"email_enabled": true, "email_on_completed": true, "email_on_started": false, "email_on_overdue": true, "inapp_enabled": true, "frequency": "realtime"}'::jsonb;
