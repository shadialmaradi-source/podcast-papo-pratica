

# Plan: Full-Site Bug Fixes and UX Improvements

## Bugs Found

### Bug 1: Notification insert uses teacher's user_id instead of student's
**File:** `src/components/teacher/AssignVideoModal.tsx` line 85
**Issue:** `user_id: user.id` sets the teacher's own ID for the notification, so the student never sees it. The notifications table RLS policy only allows viewing notifications where `auth.uid() = user_id`.
**Fix:** Look up the student's user ID from `auth.users` via a helper, or skip the notification insert entirely if the student hasn't registered yet (since we can't query `auth.users` from the client). Remove the broken notification insert for now.

### Bug 2: Auth page has no role selection during signup
**File:** `src/pages/Auth.tsx`
**Issue:** The signup flow doesn't offer a teacher/student role choice. All new users get the default `student` role from the `handle_new_user` trigger. Teachers can only register via the old `AuthPage.tsx` component (which isn't used). The `/teachers` landing page CTA should link to `/auth?role=teacher`, but even so, the Auth page's `isSignUp` logic only uses `preselectedRole` to auto-switch to signup mode -- it never updates the role.
**Fix:** When `preselectedRole === "teacher"` and signup succeeds, update the `user_roles` table to `teacher` (same pattern as `AuthPage.tsx`).

### Bug 3: "Watch" button on video assignments navigates to `/library` not the specific video
**File:** `src/pages/AppHome.tsx` line 506
**Issue:** `onClick={() => navigate('/library')}` -- should navigate to the actual video lesson page, e.g., `/lesson/${a.video_id}`.
**Fix:** Navigate to `/lesson/${a.video_id}` if `video_id` exists.

### Bug 4: `speaking_topics` predefined list only has Italian topics
**File:** Migration seeded only Italian topics
**Issue:** `AssignSpeakingModal` filters by level but not by language, so teachers teaching Spanish/English see Italian topics.
**Fix:** Filter `predefinedTopics` by `selectedLanguage` in the modal, and add seed data for other languages in a migration.

### Bug 5: Stats grid on TeacherStudentDetail only shows 2 of 3 columns
**File:** `src/pages/TeacherStudentDetail.tsx` line 206
**Issue:** The grid is `grid-cols-3` but only renders 2 cards (Lessons, Assignments). The third cell is empty, creating an awkward gap.
**Fix:** Add a third stat card (e.g., "Completed") or change to `grid-cols-2`.

### Bug 6: `dashboardReady` state in TeacherDashboard is never set to true
**File:** `src/pages/TeacherDashboard.tsx` line 25
**Issue:** `dashboardReady` is initialized as `false` but never updated. While it's not currently used to gate rendering, it's dead code that could cause confusion.
**Fix:** Remove the unused state variable.

---

## UX Improvements

### UX 1: No teacher navigation bar
**Issue:** Teacher pages have inconsistent navigation. Dashboard has a settings icon, but there's no persistent nav to go between Dashboard, Students, Settings. Users must go back to dashboard to navigate.
**Fix:** Add a simple bottom nav or top nav for teacher pages (Dashboard, Students, Settings) as a shared layout pattern.

### UX 2: Student AppHome doesn't show teacher's name for assignments
**Issue:** Video and speaking assignment cards don't show which teacher assigned them.
**Fix:** Add teacher info to the assignment cards (requires joining or storing teacher name).

### UX 3: Onboarding only shows Spanish and English as available languages
**File:** `src/pages/Onboarding.tsx` lines 13-19
**Issue:** Italian, French, German are marked `available: false` with "Coming Soon" labels, but the app has Italian content in the library.
**Fix:** Mark Italian as available since content exists.

---

## Implementation Order

1. **Fix Bug 3** -- Video assignment "Watch" navigates to wrong page (1 line change in AppHome.tsx)
2. **Fix Bug 5** -- Stats grid layout (change grid-cols-3 to grid-cols-2 in TeacherStudentDetail.tsx)
3. **Fix Bug 1** -- Remove broken notification insert in AssignVideoModal.tsx
4. **Fix Bug 2** -- Add teacher role update on signup when `role=teacher` query param in Auth.tsx
5. **Fix Bug 4** -- Filter predefined topics by language in AssignSpeakingModal.tsx
6. **Fix Bug 6** -- Remove dead `dashboardReady` state
7. **Fix UX 3** -- Mark Italian as available in Onboarding.tsx
8. **Fix UX 1** -- Add teacher bottom navigation component

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/AppHome.tsx` | Fix video assignment navigation |
| `src/pages/TeacherStudentDetail.tsx` | Fix stats grid to 2 cols |
| `src/components/teacher/AssignVideoModal.tsx` | Remove broken notification insert |
| `src/pages/Auth.tsx` | Add teacher role update on signup |
| `src/components/teacher/AssignSpeakingModal.tsx` | Filter topics by language |
| `src/pages/TeacherDashboard.tsx` | Remove dead state |
| `src/pages/Onboarding.tsx` | Mark Italian as available |
| New: `src/components/teacher/TeacherNav.tsx` | Shared bottom nav for teacher pages |
| `src/pages/TeacherDashboard.tsx` | Add TeacherNav |
| `src/pages/TeacherStudents.tsx` | Add TeacherNav |
| `src/pages/TeacherSettings.tsx` | Add TeacherNav |

