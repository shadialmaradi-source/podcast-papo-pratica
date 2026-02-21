
# Updated Roadmap: Interactive 1-on-1 Teaching Platform

## What's Already Done

### Day 1 - Foundation (Complete)
- Database schema: `teacher_lessons` and `lesson_exercises` tables with RLS policies
- Teacher role system: `user_roles` table, signup upsert fix, auto-correction on dashboard
- Teacher authentication and role-based routing

### Day 2 - Lesson Configuration (Complete)
- `CreateLessonForm`: title, student email, topic, CEFR level, exercise type selection
- `LessonList`: shows all lessons with status badges
- Lessons saved to DB as `draft` status

### Day 3 - AI Exercise Generation (Complete)
- `generate-lesson-exercises` edge function: calls AI for all 5 exercise types
- Generate / Regenerate button in lesson list
- Inline preview of generated exercises (ExerciseCard component)
- Lesson status transitions: `draft` → `ready`

---

## What's Still Missing

The current flow stops at **"I created a lesson draft"** because:
1. The Generate button calls the edge function but the RLS bug prevented teachers from even creating lessons — now fixed
2. There is no way to "run" a lesson live with a student
3. Students have no view to see or interact with their assigned lessons

---

## Remaining Roadmap

### Day 4 - Live Lesson Canvas (Complete)
- "Start Lesson" / "Resume" button on ready/active lessons
- `/teacher/lesson/:id` page with ExercisePresenter (Next/Prev/Reveal Answer)
- Lesson status transitions: `ready` → `active` → `completed`

### Day 5 - Student Lesson View (Complete)
- `/lesson/student/:id` page for students assigned by email
- `lesson_responses` table with RLS policies
- Students see exercises, submit answers, view progress
- Assigned lessons surfaced on AppHome

### Day 6 - Real-time Shared Canvas (Complete)
- `current_exercise_index` column on `teacher_lessons`
- Teacher navigation syncs index to DB
- Student subscribes via Supabase Realtime — auto-follows teacher's position
- Live indicator on student view
- Lesson completion status synced in real-time

### Day 7 - Lesson Completion & History
- Teacher marks lesson as `completed`
- Summary screen showing all exercises answered
- Student can review past lessons from their home screen

---

## Immediate Next Step (Day 4)

The most impactful next step is fixing the current dead-end: after generating exercises, teachers have no way to actually run the lesson. Day 4 delivers the live lesson presenter — a single-page teacher view where they step through exercises one by one.

This is one focused credit: 1 new page, 1 new component, 1 route, 1 button added to the existing list.
