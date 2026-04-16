

# Persist Post-Creation Lesson View Across Navigation

## Problem
After a teacher creates a lesson, they see the post-creation view (share link, video player with scenes, exercise generation). But if they navigate to another tab (Students, Settings) and come back to `/teacher`, the component remounts, `createdLessonId` is lost (it's only React state), and they see the dashboard home instead of their just-created lesson.

## Root Cause
- `handleCreated` in `TeacherDashboard.tsx` calls `sessionStorage.removeItem(STORAGE_KEY)` immediately on creation
- `createdLessonId`, `shareLink`, `lessonTranscript`, `lessonYoutubeUrl`, and `selectedExerciseTypes` live only in `useState` inside `useCreateLesson.ts` — none are persisted
- On remount, `step` defaults to `"home"` because storage was cleared

## Solution

### 1. `src/pages/TeacherDashboard.tsx`
- In `handleCreated(lessonId)`: instead of clearing storage, save `{ step: "form", lessonType, createdLessonId: lessonId }` to sessionStorage
- Add a new state `createdLessonId` read from sessionStorage on init
- When `createdLessonId` is set and `step === "form"`, skip rendering `CreateLessonForm` and instead render `LessonPostCreationView` directly (or redirect to `/teacher/lesson/${createdLessonId}`)
- Add a "Create another lesson" button that clears sessionStorage and resets to home

### 2. Simpler alternative — redirect to the dedicated lesson page
- In `handleCreated(lessonId)`: call `navigate(`/teacher/lesson/${lessonId}`)` 
- This page already has full scene segmentation, transcript, and exercise support
- The post-creation view stays inline only for the current session; if they leave, they land on the dedicated page next time
- Clear sessionStorage in `handleCreated` as it does now

**Recommendation**: The redirect approach (option 2) is simpler and more robust. The `/teacher/lesson/:id` page already supports everything. The only trade-off is the user leaves the dashboard flow, but that's actually better UX — the lesson has its own permanent URL.

### Files changed

| File | Change |
|------|--------|
| `src/pages/TeacherDashboard.tsx` | `handleCreated`: navigate to `/teacher/lesson/${lessonId}` after clearing storage |

This is a one-line change. After creation, the teacher lands on the dedicated lesson page which persists across navigation and refreshes.

