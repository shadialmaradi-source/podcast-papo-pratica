

# Plan: Video & Speaking Assignment System

## Summary

Create a new `video_assignments` table and UI components so teachers can assign library videos and speaking topics to students. Students see assignments in a new "Assignments" tab on their home page with notifications.

---

## Database Changes

### New table: `video_assignments`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| teacher_id | uuid NOT NULL | references teacher who assigned |
| student_email | text NOT NULL | matches existing pattern |
| assignment_type | text NOT NULL | 'video' or 'speaking' |
| video_id | text NULL | youtube video_id for video assignments |
| video_title | text NULL | stored for display |
| speaking_topic | text NULL | custom or predefined topic text |
| speaking_level | text NULL | CEFR level for speaking |
| due_date | date NULL | optional deadline |
| note | text NULL | teacher's note |
| status | text NOT NULL DEFAULT 'assigned' | assigned / completed |
| created_at | timestamptz DEFAULT now() |
| completed_at | timestamptz NULL |

**RLS policies:**
- Teachers can INSERT/SELECT/UPDATE/DELETE where `teacher_id = auth.uid()`
- Students can SELECT where `student_email = get_auth_user_email()`
- Students can UPDATE own assignments (to mark completed)

### New table: `speaking_topics` (predefined list)

| Column | Type |
|--------|------|
| id | uuid PK |
| topic | text NOT NULL |
| cefr_level | text NOT NULL |
| language | text NOT NULL DEFAULT 'italian' |
| created_at | timestamptz DEFAULT now() |

RLS: SELECT for all authenticated users.

---

## UI Changes

### Part 1: Assign from Library Page

**File: `src/pages/Library.tsx`**
- Detect teacher role via `useUserRole()`
- Add "Assign" button on each `VideoCard` (only visible for teachers)
- Opens `AssignVideoModal`

**New: `src/components/teacher/AssignVideoModal.tsx`**
- Props: `video` (title, video_id), `open`, `onOpenChange`
- Fetches teacher's students from `teacher_students`
- Fields: Student dropdown, due date (optional datepicker), note (optional textarea)
- On submit: inserts into `video_assignments`, creates notification in `notifications` table, shows toast

### Part 2: Assign from Student Detail Page

**File: `src/pages/TeacherStudentDetail.tsx`**
- Add "Assign" dropdown button with options:
  - "Assign Library Video" -- opens a video browser modal (reuse `CommunityVideoBrowser` pattern) then the assign modal
  - "Assign Speaking Topic" -- opens `AssignSpeakingModal`

**New: `src/components/teacher/AssignSpeakingModal.tsx`**
- Student pre-selected (from context)
- Tab: "Predefined" (list from `speaking_topics` filtered by student level) or "Custom" (free text input)
- CEFR level selector, due date, note
- On submit: inserts into `video_assignments` with type='speaking'

### Part 3: Student Experience

**File: `src/pages/AppHome.tsx`**
- Add "Assignments" section (similar to existing "My Lessons" section)
- Query `video_assignments` where `student_email = user_email` and `status = 'assigned'`
- Show cards with: assignment type icon, title/topic, due date badge, teacher note
- Video assignments link to `/library/video/{video_id}`
- Speaking assignments show the topic and a "Mark Complete" button

**File: `src/components/NotificationsCenter.tsx`**
- New assignments appear as notifications (inserted by the assign flow)

### Part 4: Teacher Student Detail -- Assignments Tab

**File: `src/pages/TeacherStudentDetail.tsx`**
- Add a second section below "Lessons" showing video/speaking assignments for this student
- Shows status, due date, completion

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/components/teacher/AssignVideoModal.tsx` |
| Create | `src/components/teacher/AssignSpeakingModal.tsx` |
| Create | `src/components/teacher/VideoBrowserModal.tsx` |
| Modify | `src/pages/Library.tsx` -- add Assign button for teachers |
| Modify | `src/pages/TeacherStudentDetail.tsx` -- add Assign dropdown + assignments list |
| Modify | `src/pages/AppHome.tsx` -- add Assignments section for students |
| Modify | `src/components/library/VideoCard.tsx` -- accept optional onAssign prop |
| Migration | Create `video_assignments` + `speaking_topics` tables with RLS |

