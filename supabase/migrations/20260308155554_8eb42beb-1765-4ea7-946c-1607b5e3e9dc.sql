
-- Create community_lessons table
CREATE TABLE public.community_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_lesson_id uuid NOT NULL REFERENCES teacher_lessons(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  teacher_name text NOT NULL DEFAULT '',
  title text NOT NULL,
  description text,
  lesson_type text NOT NULL DEFAULT 'paragraph',
  language text NOT NULL DEFAULT 'italian',
  translation_language text NOT NULL DEFAULT 'english',
  cefr_level text NOT NULL DEFAULT 'A1',
  topic text,
  exercise_types text[] NOT NULL DEFAULT '{}',
  copy_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_lessons ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can browse
CREATE POLICY "Authenticated can view community lessons"
  ON community_lessons FOR SELECT TO authenticated
  USING (true);

-- Teachers can publish their own
CREATE POLICY "Teachers can insert own community lessons"
  ON community_lessons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

-- Teachers can remove their own
CREATE POLICY "Teachers can delete own community lessons"
  ON community_lessons FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id);

-- Owner can update
CREATE POLICY "Teachers can update own community lessons"
  ON community_lessons FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id);

CREATE INDEX idx_community_lessons_level ON community_lessons(cefr_level);
CREATE INDEX idx_community_lessons_language ON community_lessons(language);
CREATE INDEX idx_community_lessons_copy_count ON community_lessons(copy_count DESC);

-- Add is_community_shared column to teacher_lessons
ALTER TABLE teacher_lessons ADD COLUMN is_community_shared boolean NOT NULL DEFAULT false;

-- RPC to increment copy count (any authenticated teacher can call)
CREATE OR REPLACE FUNCTION public.increment_community_copy_count(lesson_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE community_lessons SET copy_count = copy_count + 1 WHERE id = lesson_id;
$$;
