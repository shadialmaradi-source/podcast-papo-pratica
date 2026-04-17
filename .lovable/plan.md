

# Fix Shared Lesson Link Flow (404 + Onboarding Skip)

## Root Cause
Two bugs:

1. **Wrong URL path** — `TeacherLesson.tsx` line 420 builds `/student/lesson/${share_token}`, but the actual route in `App.tsx` line 186 is `/lesson/student/:id`. Result: NotFound (404) for everyone clicking the share link.
2. **Onboarding forces unnecessary steps** — A brand-new student arriving via a share link still has to pick target language + native language, even though the teacher's lesson already encodes both (`lesson.language`, `lesson.translation_language`).

## Solution

### 1. Fix the share URL — `src/pages/TeacherLesson.tsx`
Line 420: change `/student/lesson/${lesson.share_token}` → `/lesson/student/${lesson.share_token}`. One-line fix. The existing `setPendingLessonRedirect` regex in `authRedirect.ts` already matches this path.

### 2. Skip onboarding entirely for shared-lesson signups

**`src/pages/AuthCallback.tsx`** — when `lessonRedirect` is set and student profile is missing `native_language`:
- Fetch the lesson by share_token to read `lesson.language` and `lesson.translation_language`
- Auto-fill `profiles` row: `selected_language = lesson.language`, `native_language = lesson.translation_language` (or browser language fallback), `current_level = lesson.cefr_level || 'A1'`
- Navigate directly to `/lesson/student/<token>` — bypass `/onboarding` completely

**`src/components/auth/AuthPage.tsx`** (email/password signup path) — apply the same logic: after successful signup/login, if there's a `pending_lesson_token`, hydrate the profile from the lesson and skip onboarding redirect.

### 3. Defensive guard — `src/pages/Onboarding.tsx`
If a user somehow lands on `/onboarding` while `pending_lesson_token` is set AND their profile is empty, auto-hydrate from the lesson and redirect to the lesson page. Prevents stuck loops.

## Files Changed

| File | Change |
|---|---|
| `src/pages/TeacherLesson.tsx` | Fix shareLink path: `/student/lesson/` → `/lesson/student/` |
| `src/pages/AuthCallback.tsx` | When pending lesson token exists, fetch lesson, auto-create profile from lesson metadata, skip onboarding |
| `src/components/auth/AuthPage.tsx` | Same auto-hydrate logic on email signup/login completion |
| `src/pages/Onboarding.tsx` | Defensive: auto-hydrate + redirect if pending lesson token + empty profile |
| `src/utils/onboardingStatus.ts` | Add helper `hydrateProfileFromLesson(userId, lesson)` to centralize the upsert logic |

No DB schema changes — `profiles` already has `selected_language`, `native_language`, `current_level`.

## Acceptance Flow
1. Teacher copies share link → URL is now `/lesson/student/<token>` ✅
2. Logged-out student clicks → redirected to `/auth` with `pending_lesson_token` saved
3. Student signs up (email or Google) → profile auto-created from lesson metadata → lands directly on `/lesson/student/<token>` ✅ (no onboarding screens)
4. Already-logged-in student clicks → straight to lesson ✅

