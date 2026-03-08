

# Plan: Deep PostHog Analytics -- Funnels, Page Views & Drop-off Tracking

## What exists today
- `analytics.ts` has `trackEvent`, `trackPageView`, `trackPageLoad`, `setSection`, `setUserProperties`, `identifyUser`
- Person properties (role, plan, level, language) are set on login in `useAuth.tsx`
- Several pages already track events but many are missing `trackPageView` with section context
- No funnel step tracking, no session duration, no abandonment tracking

## What's missing

**Pages with NO `trackPageView`:**
- `LandingPage.tsx`, `Onboarding.tsx`, `FirstLesson.tsx`, `AppHome.tsx`, `Library.tsx`, `Lesson.tsx`, `WeekDetail.tsx`, `WeekVideo.tsx`, `MyLessons.tsx`, `Premium.tsx`, `ProfilePageWrapper.tsx`
- `TeacherDashboard.tsx` (has `trackPageLoad` but no `trackPageView`), `TeacherOnboarding.tsx`, `TeacherLesson.tsx`, `TeacherCommunity.tsx`, `TeacherBranding.tsx`, `TeacherAnalytics.tsx`

**No funnel tracking** for onboarding, first lesson, teacher onboarding, or lesson creation flows.

**No session duration or abandonment tracking.**

## Implementation

### 1. Enhance `src/lib/analytics.ts`

Add three new exports:
- `trackFunnelStep(funnel, step, stepIndex, props?)` -- fires `${funnel}_step` event with funnel metadata
- `trackSessionStart()` -- stores start time in sessionStorage
- `trackSessionEnd()` -- fires `session_ended` with duration_seconds on beforeunload

### 2. Add session tracking in `src/App.tsx`

- Call `trackSessionStart()` alongside `initAnalytics()`
- Add `beforeunload` listener calling `trackSessionEnd()`

### 3. Add `trackPageView` to all pages (20 pages)

Each page gets a `useEffect` with `trackPageView("page_name", "student"|"teacher"|"shared")`:

| Page | Section | Page Name |
|---|---|---|
| `LandingPage.tsx` | shared | `landing` |
| `Onboarding.tsx` | shared | `onboarding` |
| `FirstLesson.tsx` | student | `first_lesson` |
| `AppHome.tsx` | student | `app_home` |
| `Library.tsx` | student | `library` |
| `Lesson.tsx` | student | `lesson` |
| `WeekDetail.tsx` | student | `week_detail` |
| `WeekVideo.tsx` | student | `week_video` |
| `MyLessons.tsx` | student | `my_lessons` |
| `Premium.tsx` | student | `premium` |
| `ProfilePageWrapper.tsx` | shared | `profile` |
| `TeacherDashboard.tsx` | teacher | `teacher_dashboard` |
| `TeacherOnboarding.tsx` | teacher | `teacher_onboarding` |
| `TeacherLesson.tsx` | teacher | `teacher_lesson` |
| `TeacherCommunity.tsx` | teacher | `teacher_community` |
| `TeacherBranding.tsx` | teacher | `teacher_branding` |
| `TeacherAnalytics.tsx` | teacher | `teacher_analytics` |

### 4. Add funnel tracking to key conversion paths

**Student Onboarding Funnel** (`Onboarding.tsx`):
- `onboarding_funnel_step` with steps: `language_selected` (0), `native_selected` (1), `level_selected` (2), `completed` (3)

**First Lesson Funnel** (`FirstLesson.tsx`):
- `first_lesson_step` with steps: `intro` (0), `video` (1), `exercises` (2), `speaking` (3), `flashcards` (4), `complete` (5)
- Track each step transition + abandonment on `beforeunload`

**Week Video Lesson Funnel** (`WeekVideo.tsx`):
- `lesson_step` with steps matching the lesson step transitions

**Teacher Onboarding Funnel** (`TeacherOnboarding.tsx`):
- `teacher_onboarding_step` with steps: `profile` (0), `add_student` (1), `tour` (2), `completed` (3)

**Teacher Lesson Creation Funnel** (`CreateLessonForm.tsx`):
- `teacher_lesson_creation_started` on form mount
- `teacher_lesson_creation_completed` on success with type/language

### 5. Add feature usage events to Library

- `student_video_clicked` when navigating to a video
- `student_library_searched` on search input (debounced)
- `student_library_filtered` on filter/tab changes

### 6. PostHog Dashboard Configuration

This is purely about event naming conventions that enable PostHog dashboards. With the events above, in PostHog you can create:

**Student Dashboard** (filter: `section = student`):
- Funnel: onboarding_funnel_step 0→1→2→3 (conversion rate)
- Funnel: first_lesson_step 0→1→2→3→4→5 (drop-off per step)
- Bar chart: most visited student pages ($pageview where section=student, breakdown by page)
- Retention: student_lesson_opened → student_lesson_completed
- Table: feature usage frequency (student_video_clicked, student_speaking_opened, etc.)

**Teacher Dashboard** (filter: `section = teacher`):
- Funnel: teacher_onboarding_step 0→1→2→3
- Funnel: teacher_lesson_creation_started → teacher_lesson_creation_completed
- Bar chart: most visited teacher pages
- Table: teacher_student_added, teacher_video_assigned, teacher_speaking_assigned counts
- Retention: teacher_dashboard viewed → lesson created within 7 days

No code is needed for the dashboards themselves -- they are configured in the PostHog UI using the events we fire.

## Files Changed

| File | Change |
|---|---|
| `src/lib/analytics.ts` | Add `trackFunnelStep`, `trackSessionStart`, `trackSessionEnd` |
| `src/App.tsx` | Add session start/end tracking |
| `src/pages/LandingPage.tsx` | Add `trackPageView` |
| `src/pages/Onboarding.tsx` | Add `trackPageView` + funnel steps |
| `src/pages/FirstLesson.tsx` | Add `trackPageView` + funnel steps + abandonment |
| `src/pages/AppHome.tsx` | Add `trackPageView` |
| `src/pages/Library.tsx` | Add `trackPageView` + search/filter/click events |
| `src/pages/Lesson.tsx` | Add `trackPageView` |
| `src/pages/WeekDetail.tsx` | Add `trackPageView` |
| `src/pages/WeekVideo.tsx` | Add `trackPageView` + lesson step funnel |
| `src/pages/MyLessons.tsx` | Add `trackPageView` |
| `src/pages/Premium.tsx` | Add `trackPageView` |
| `src/pages/ProfilePageWrapper.tsx` | Add `trackPageView` |
| `src/pages/TeacherDashboard.tsx` | Add `trackPageView` + action tracking |
| `src/pages/TeacherOnboarding.tsx` | Add `trackPageView` + funnel steps |
| `src/pages/TeacherLesson.tsx` | Add `trackPageView` |
| `src/pages/TeacherCommunity.tsx` | Add `trackPageView` |
| `src/pages/TeacherBranding.tsx` | Add `trackPageView` |
| `src/pages/TeacherAnalytics.tsx` | Add `trackPageView` |
| `src/components/teacher/CreateLessonForm.tsx` | Add creation started/completed funnel events |

