

# Plan: Add Teacher Community Features

## Overview
Create a `/teacher/community` page where teachers can browse, search, and copy publicly shared lessons from other teachers. Add a "share with community" toggle to lesson creation, and display top contributors.

## Database Changes (Migration)

### New table: `community_lessons`
Stores references to shared lessons with denormalized metadata for fast browsing.

```sql
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

-- Service role + owner can update (for copy_count increments)
CREATE POLICY "Teachers can update own community lessons"
  ON community_lessons FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id);

CREATE INDEX idx_community_lessons_level ON community_lessons(cefr_level);
CREATE INDEX idx_community_lessons_language ON community_lessons(language);
CREATE INDEX idx_community_lessons_copy_count ON community_lessons(copy_count DESC);
```

Also add `is_community_shared` boolean column to `teacher_lessons`:
```sql
ALTER TABLE teacher_lessons ADD COLUMN is_community_shared boolean NOT NULL DEFAULT false;
```

## Files to Create

### `src/pages/TeacherCommunity.tsx`
Main community page with:
- **Search bar** (text input filtering title/topic)
- **Filters**: Language dropdown, CEFR level dropdown, sort by (Most Copied / Newest)
- **Lesson cards grid**: Title, teacher name, level, language, exercise count, copy count, "Copy to My Lessons" button
- **Top Contributors sidebar/section**: Top 5 teachers by total copy_count this month
- **Copy action**: Duplicates the `teacher_lessons` row + its `lesson_exercises` into the current teacher's account
- Fetches from `community_lessons` table with filters
- Tracks `community_viewed` on mount, `lesson_copied` on copy

### `src/components/teacher/CommunityLessonCard.tsx`
Card component for a community lesson: title, teacher name, level badge, language, copy count, copy button.

## Files to Modify

### `src/components/teacher/CreateLessonForm.tsx`
- Add "Share with Community" Switch toggle after lesson creation success (alongside the share link)
- On toggle: insert/delete from `community_lessons` and update `teacher_lessons.is_community_shared`

### `src/pages/TeacherDashboard.tsx`
- Add a 5th hero card: "Community" with Globe icon, navigates to `/teacher/community`

### `src/App.tsx`
- Add route: `/teacher/community` -> `<ProtectedRoute><TeacherCommunity /></ProtectedRoute>`

## Copy Logic (in TeacherCommunity)
When a teacher clicks "Copy":
1. Fetch source `teacher_lessons` row by `source_lesson_id`
2. Insert new row into `teacher_lessons` with current teacher's ID, new share_token, `is_community_shared = false`
3. Fetch and duplicate all `lesson_exercises` for the source lesson
4. Increment `copy_count` on `community_lessons` via RPC or direct update
5. Show toast: "Lesson copied to your dashboard!"

## Technical Notes
- The `community_lessons` table uses denormalized fields (title, teacher_name, etc.) to avoid cross-teacher JOINs that RLS would block
- Copy count updates require the source teacher to own the row; we'll use an RPC function `increment_copy_count` with SECURITY DEFINER to allow any authenticated teacher to increment

### Additional RPC function:
```sql
CREATE OR REPLACE FUNCTION public.increment_community_copy_count(lesson_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE community_lessons SET copy_count = copy_count + 1 WHERE id = lesson_id;
$$;
```

