

# Plan: Build "My Students" Page at `/teacher/students`

## Overview
Create a full student management page for teachers with list view, add/edit/archive capabilities, filters, stats, and a student detail view.

## Files to Create

### 1. `src/pages/TeacherStudents.tsx`
Main page with:
- **Header**: "My Students (N)" + "Add Student" button
- **Stats row**: Active this week, average completion rate, total lessons assigned (computed from `teacher_lessons` joined with `lesson_responses`)
- **Filters**: Status (All/Active/Invited/Archived), Level (All/A1-C2), Sort (Last Active/Name/Completion)
- **Table**: Name/Email, Level, Lessons Assigned, Completed (%), Last Active, Status badge, Actions (View/Edit/Archive)
- Data fetched via multiple queries: `teacher_students`, then `teacher_lessons` + `lesson_responses` for stats per student
- Analytics: `my_students_viewed`, `student_added`, `student_edited`, `student_archived`

### 2. `src/pages/TeacherStudentDetail.tsx`
Detail view at `/teacher/student/:studentId`:
- Student info card (email, name, level, native language, notes)
- Edit button → inline edit mode
- Assigned lessons table (from `teacher_lessons` where `student_email` matches)
- Lesson completion stats
- Back button to `/teacher/students`

### 3. `src/components/teacher/AddStudentModal.tsx`
Dialog with fields: email (required), name, CEFR level (A1-C2 dropdown), native language, notes textarea. Inserts into `teacher_students`.

### 4. `src/components/teacher/EditStudentModal.tsx`
Same form as Add, pre-filled. Updates `teacher_students` row.

## Files to Modify

### `src/App.tsx`
- Import `TeacherStudents` and `TeacherStudentDetail`
- Add routes: `/teacher/students` and `/teacher/student/:studentId` (both protected)

### `src/pages/TeacherDashboard.tsx`
- Make "My Students" card clickable → `navigate("/teacher/students")`
- Remove `opacity-60` and "Coming soon"

## No Database Changes
The `teacher_students` and `teacher_lessons` tables already exist with proper RLS. Lesson stats will be computed client-side by querying `teacher_lessons` filtered by `student_email` and `teacher_id`.

## Level Display
CEFR levels (A1, A2, B1, B2, C1, C2) shown on frontend. Internally stored as-is in `teacher_students.level`.

