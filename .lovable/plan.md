

## Move "Your lessons" to a dedicated page

Today the lessons list lives at the bottom of `/teacher`, and the "View Lessons" button on the draft-lesson card just scrolls down the same page (`/teacher#teacher-lessons-section`). The user wants a real separate page so clicking "View Lessons" navigates somewhere new instead of scrolling.

### Changes

**1. New page: `src/pages/TeacherLessons.tsx`**
- Standalone page with header (back button → `/teacher`, title "Your lessons", `TeacherNotificationBell`, settings icon — same chrome as the dashboard).
- Body: a `Refresh` button + the existing `<LessonList refresh={...} />` component, reusing the same data/UI so card behaviour (Start, Resume, Regenerate, Preview) is identical.
- Includes `<TeacherNav />` at the bottom.
- Uses the same `ProtectedRoute section="teacher"` guard.

**2. Routing: `src/App.tsx`**
- Replace the current redirect on `/teacher/lessons` with the new page:
  ```
  <Route path="/teacher/lessons" element={<ProtectedRoute section="teacher"><TeacherLessons /></ProtectedRoute>} />
  ```
- Add the import for `TeacherLessons`.

**3. Dashboard: `src/pages/TeacherDashboard.tsx`**
- Remove the `<section id="teacher-lessons-section">` block (lines ~594–602) and the related scroll-into-view `useEffect` (lines ~113–119).
- Remove the now-unused `lessonListRefresh` state, the `LessonList` import, and the `setLessonListRefresh` call inside `handleCreated` (after creation we navigate to `/teacher/lesson/:id` anyway).
- Add a small "Your lessons" entry-point card in the home grid (next to "Create a Lesson" / "My Students") that routes to `/teacher/lessons`, so teachers still have a one-tap way in from the dashboard.

**4. Update internal link: `src/components/teacher/NextBestAction.tsx`**
- Change the draft-lesson card CTA from `onNavigate("/teacher#teacher-lessons-section")` to `onNavigate("/teacher/lessons")`.

**5. Anywhere else that links to `#teacher-lessons-section`**
- Sweep and update those links to `/teacher/lessons` (currently only `NextBestAction` and the dashboard's own scroll handler use it).

No backend, data, or styling changes. `LessonList` is reused as-is. After creating a lesson, the existing flow still navigates to `/teacher/lesson/:id`, unchanged.

### Files touched

- `src/pages/TeacherLessons.tsx` — new dedicated page hosting `LessonList` with the standard teacher header + nav.
- `src/App.tsx` — route `/teacher/lessons` now renders `TeacherLessons` instead of redirecting.
- `src/pages/TeacherDashboard.tsx` — remove the inline lessons section + scroll effect; add a "Your lessons" entry card linking to `/teacher/lessons`.
- `src/components/teacher/NextBestAction.tsx` — draft-lesson CTA navigates to `/teacher/lessons`.

