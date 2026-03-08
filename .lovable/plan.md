

# Plan: Deep PostHog Analytics -- Student & Teacher Macro Sections

## Summary

Enhance the analytics module to systematically track all user actions across two macro sections (Student and Teacher), using PostHog's `$set` person properties to segment users by role. Add a `section` property to every event, structured event naming conventions, and comprehensive tracking across all pages and key interactions that currently lack it.

## Analytics Architecture

### Person Properties (set via `$identify`)

Every identified user gets:
- `role`: "student" or "teacher" (set on login via user_roles lookup)
- `plan`: "free" / "pro" (for teachers)
- `cefr_level`: current level
- `target_language`: learning language
- `native_language`: native language

This enables PostHog dashboards to filter all events by Student vs Teacher sections.

### Event Naming Convention

All events prefixed by section:
- **Student events**: `student_*` (e.g. `student_lesson_started`, `student_exercise_answered`)
- **Teacher events**: `teacher_*` (e.g. `teacher_lesson_created`, `teacher_student_added`)
- **Shared events**: `auth_*`, `onboarding_*` (keep existing names)

Every event gets a `section: "student" | "teacher" | "shared"` property automatically.

## Changes to `src/lib/analytics.ts`

- Add `setUserProperties(props)` function that sends `$set` via `$identify`
- Add `setSection(section)` that stores current section in memory, auto-attached to all events
- Update `postCapture` to always include `section` and `app_version` properties
- Add `trackPageView(page, section)` combining pageview + section tracking

## New Tracking Points

### Student Section (pages missing tracking)

| Page/Component | Events to Add |
|---|---|
| `SpeakingAssignment.tsx` | `student_speaking_opened`, `student_speaking_response_saved`, `student_speaking_marked_prepared` |
| `StudentLesson.tsx` | `student_lesson_opened`, `student_exercise_answered` (per question with correct/incorrect), `student_lesson_completed`, `student_speaking_submitted` |
| `AppHome.tsx` | `student_speaking_assignment_clicked`, `student_video_assignment_clicked` (already has some, add speaking) |
| `Library.tsx` | `student_video_searched`, `student_video_filtered` |
| `VocabularyManager` | `student_vocab_added`, `student_vocab_reviewed` |

### Teacher Section (pages missing tracking)

| Page/Component | Events to Add |
|---|---|
| `TeacherStudents.tsx` | `teacher_students_viewed`, `teacher_student_added`, `teacher_student_archived`, `teacher_student_edited` |
| `TeacherStudentDetail.tsx` | `teacher_student_detail_viewed`, `teacher_video_assigned`, `teacher_speaking_assigned` |
| `TeacherSettings.tsx` | `teacher_settings_viewed`, `teacher_settings_updated` |
| `AssignSpeakingModal.tsx` | `teacher_speaking_topic_selected`, `teacher_speaking_custom_topic` |
| `AssignVideoModal.tsx` | `teacher_video_assigned` |
| `CreateLessonForm.tsx` | `teacher_lesson_created` (already has some, add type/language) |
| `AddStudentModal.tsx` | `teacher_student_invited` |
| `TeacherPricing.tsx` | `teacher_pricing_viewed`, `teacher_upgrade_clicked` |

### Enhanced Identity on Login

Update `useAuth.tsx` `onAuthStateChange` handler:
- After `SIGNED_IN`, fetch `user_roles` to get role
- Call `identifyUser` with role, email, and person properties
- This ensures PostHog knows if the user is a student or teacher from the first event

## Files Changed

| File | Change |
|---|---|
| `src/lib/analytics.ts` | Add `setUserProperties`, `setSection`, `trackPageView`, auto-attach section to all events |
| `src/hooks/useAuth.tsx` | Fetch role on sign-in, send person properties to PostHog |
| `src/pages/SpeakingAssignment.tsx` | Add 3 student speaking events |
| `src/pages/StudentLesson.tsx` | Add lesson opened/completed/exercise events |
| `src/pages/TeacherStudents.tsx` | Add page view + student management events |
| `src/pages/TeacherStudentDetail.tsx` | Add detail view + assignment events |
| `src/pages/TeacherSettings.tsx` | Add settings view/update events |
| `src/pages/TeacherPricing.tsx` | Add pricing view/upgrade events |
| `src/components/teacher/AssignSpeakingModal.tsx` | Add topic selection events |
| `src/components/teacher/AssignVideoModal.tsx` | Add video assigned event |
| `src/components/teacher/AddStudentModal.tsx` | Add student invited event |

