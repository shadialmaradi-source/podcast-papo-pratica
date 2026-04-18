
The user wants:
1. Fix the immediate bug: existing student signs in via shared lesson link → should land on the lesson, not `/app`.
2. New student via shared link (Google or email) → skip onboarding entirely, hydrate profile from teacher lesson metadata (language, native language, level) — this already exists via `hydrateProfileFromLesson` in `AuthCallback.tsx` but needs to also work in the email signup path in `Auth.tsx`.

Looking at the code, `AuthCallback.tsx` already handles the new-user-from-share-token case (hydrate + skip onboarding). The gaps:
- `Auth.tsx` sign-in handler likely doesn't check `getPendingLessonRedirect()` before defaulting to `/app`.
- `Auth.tsx` email signup handler likely doesn't apply the same hydration shortcut as `AuthCallback.tsx`.

## Plan

### 1. `src/pages/Auth.tsx` — sign-in path (existing users)
After successful sign-in, before any default redirect:
- Read `getPendingLessonRedirect()`. If present → `navigate(lessonRedirect, { replace: true })` immediately. This covers existing students who already completed onboarding.

### 2. `src/pages/Auth.tsx` — email signup path (new users)
After successful email signup + session established, mirror `AuthCallback.tsx` logic:
- Read pending lesson redirect → extract share token via `extractShareTokenFromPath`.
- If token exists and profile requires onboarding → call `fetchLessonForHydration` + `hydrateProfileFromLesson` → `navigate(lessonRedirect)` directly, **skipping onboarding**.
- Profile gets `selected_language` (lesson.language), `native_language` (lesson.translation_language), `current_level` (lesson.cefr_level) from teacher's lesson — exactly what the user requested.

### 3. Google OAuth path
Already handled correctly in `AuthCallback.tsx` (lines that call `hydrateProfileFromLesson`). No change needed — but verify that the Google sign-in button in `Auth.tsx` preserves the `pending_lesson_token` in localStorage through the OAuth round-trip (it does, since localStorage persists).

### 4. Files touched
- `src/pages/Auth.tsx` — add lesson-redirect check in sign-in handler; add hydration shortcut in email signup handler (import the same helpers `AuthCallback.tsx` uses).

No DB changes. No new utilities — reuses `getPendingLessonRedirect`, `extractShareTokenFromPath`, `fetchLessonForHydration`, `hydrateProfileFromLesson`, `requiresOnboarding`.
