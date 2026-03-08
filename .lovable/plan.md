

# Plan: Speaking Assignment System (Phase 1)

## Summary

Build a full speaking topics system with questions, assignments, and student response tracking. Keep existing `video_assignments` table for video assignments. Add new tables for speaking-specific data. Create an edge function for AI question generation. Add a student-facing speaking assignment detail page.

---

## Database Changes (Migration)

### New Tables

**`speaking_assignments`** -- Teacher assigns a topic to a student
- `id` uuid PK
- `teacher_id` uuid NOT NULL
- `student_email` text NOT NULL
- `topic_title` text NOT NULL
- `topic_description` text NULL
- `cefr_level` text NOT NULL DEFAULT 'A1'
- `language` text NOT NULL DEFAULT 'italian'
- `custom_instructions` text NULL
- `due_date` date NULL
- `status` text NOT NULL DEFAULT 'assigned' (assigned / reviewed / completed)
- `created_at` timestamptz DEFAULT now()
- `completed_at` timestamptz NULL
- UNIQUE(teacher_id, student_email, topic_title)

**`speaking_questions`** -- Questions linked to an assignment
- `id` uuid PK
- `assignment_id` uuid NOT NULL REFERENCES speaking_assignments(id) ON DELETE CASCADE
- `question_text` text NOT NULL
- `difficulty` integer DEFAULT 1 (1=easy, 2=medium, 3=hard)
- `order_index` integer DEFAULT 0
- `created_at` timestamptz DEFAULT now()

**`speaking_responses`** -- Student answers per question
- `id` uuid PK
- `assignment_id` uuid NOT NULL REFERENCES speaking_assignments(id) ON DELETE CASCADE
- `question_id` uuid NOT NULL REFERENCES speaking_questions(id) ON DELETE CASCADE
- `student_id` uuid NOT NULL
- `response_type` text DEFAULT 'text' (text only for now; audio later)
- `response_text` text NULL
- `is_prepared` boolean DEFAULT false
- `submitted_at` timestamptz DEFAULT now()

### RLS Policies

- **speaking_assignments**: Teachers CRUD on `teacher_id = auth.uid()`. Students SELECT/UPDATE where `student_email = get_auth_user_email()`.
- **speaking_questions**: Teachers CRUD via JOIN to speaking_assignments. Students SELECT via JOIN.
- **speaking_responses**: Students INSERT/SELECT/UPDATE on `student_id = auth.uid()`. Teachers SELECT via JOIN to speaking_assignments.

---

## Edge Function: `generate-speaking-questions`

- Input: `{ topic: string, level: string, language: string }`
- Uses Lovable AI Gateway (`google/gemini-3-flash-preview`)
- Generates 6-8 questions: easy (1-3), medium (4-6), difficult (7-8)
- Returns JSON array of `{ question: string, difficulty: number }`
- Uses tool calling for structured output

---

## UI Changes

### 1. Update `AssignSpeakingModal` (major rewrite)

Currently inserts into `video_assignments`. Rewrite to:
- Insert into `speaking_assignments` instead
- After insert, call `generate-speaking-questions` edge function
- Insert generated questions into `speaking_questions`
- Support both predefined topics and custom topics (custom triggers AI generation)
- For predefined topics, also generate questions via AI based on the topic text

### 2. New Page: `/speaking/:assignmentId` (Student Speaking Detail)

**File: `src/pages/SpeakingAssignment.tsx`**
- Fetches assignment + questions + existing responses
- Shows topic title, teacher instructions, due date
- Lists questions with difficulty indicators (green/yellow/red dots)
- Each question has a "Type Notes" textarea
- "Mark as Prepared" button updates status
- Auto-saves responses on blur

### 3. Update `AppHome.tsx` (Student View)

- Fetch from `speaking_assignments` instead of filtering `video_assignments` for speaking type
- Speaking assignments show "View Questions" button linking to `/speaking/:id`
- Video assignments remain from `video_assignments` table

### 4. Update `TeacherStudentDetail.tsx`

- Fetch speaking assignments from `speaking_assignments` table
- Show assignment status + number of questions answered
- Click to expand and see which questions have responses

### 5. Update `AssignVideoModal` notification

- Fix: currently sets `user_id: user.id` (teacher's ID) for notification but should find the student's user ID by email, or skip if student not yet registered

### 6. Add Route

- Add `/speaking/:assignmentId` route in `App.tsx`

---

## Files Summary

| Action | File |
|--------|------|
| Migration | New tables: speaking_assignments, speaking_questions, speaking_responses |
| Create | `supabase/functions/generate-speaking-questions/index.ts` |
| Create | `src/pages/SpeakingAssignment.tsx` |
| Rewrite | `src/components/teacher/AssignSpeakingModal.tsx` |
| Modify | `src/pages/AppHome.tsx` -- split video/speaking fetching |
| Modify | `src/pages/TeacherStudentDetail.tsx` -- fetch from speaking_assignments |
| Modify | `src/App.tsx` -- add speaking route |

