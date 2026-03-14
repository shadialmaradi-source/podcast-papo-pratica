

# Onboarding + First-Lesson Stabilization — 5 Files

## File 1: `src/pages/Onboarding.tsx`

### 1a. Target languages — only English active (lines 13-19)
Replace the `targetLanguages` array so only `english` has `available: true`. All others (`spanish`, `italian`, `french`, `german`) get `available: false`. Add `portuguese` as unavailable too.

### 1b. Default language safely to English
The `selectedLanguage` state initializer stays `null` for fresh flow. When returning via `?step=level`, default to `localStorage.getItem('onboarding_language') || 'english'`.

### 1c. Prefill native language from browser (new helper, inline)
Add a small `detectBrowserNativeLanguage()` function that reads `navigator.language`, splits on `-`, checks against `supportedNativeCodes`, falls back to `'en'`. Use it as the initial value for `selectedNativeLanguage`.

### 1d. Support return-to-first-lesson from level selection
Read `useSearchParams` for `?step=level&return=first-lesson`. If `step=level`, initialize the step state to `'level'` and restore `selectedLanguage` and `selectedNativeLanguage` from localStorage. In `handleFinalContinue`, always navigate to `/lesson/first`.

### 1e. Set first_lesson_completed = "false"
Add a `useEffect` that sets `localStorage.setItem('first_lesson_completed', 'false')` when the component mounts. Also set it explicitly in `handleFinalContinue` before navigating.

---

## File 2: `src/pages/FirstLesson.tsx`

### 2a. Change fallback language (line 46)
```
const targetLanguage = localStorage.getItem('onboarding_language') || 'english';
```

### 2b. Redirect if missing params (after line 47)
Add a guard: if any of `onboarding_language`, `onboarding_native_language`, or `onboarding_level` is missing from localStorage, redirect to `/onboarding`. Skip this check for teacher preview.

### 2c. Set first_lesson_completed = "true" (in handleFlashcardsComplete, line 123-128)
After `localStorage.removeItem('lesson_step')`, add:
```typescript
localStorage.setItem('first_lesson_completed', 'true');
```

### 2d. Add "Change level" button
In the `LessonIntro` case (line 151), pass an `onChangeLevel` prop that navigates to `/onboarding?step=level&return=first-lesson`. The `LessonIntro` component already accepts props — we'll add a small button. Actually, since `LessonIntro` is a separate component, we add the button in `FirstLesson.tsx` by wrapping the intro step with an additional element below it.

Alternative minimal approach: Add a button directly in the `wrapWithBanner` output for the intro step only.

---

## File 3: `src/components/lesson/LessonExercises.tsx`

### 3a. Change fallback language (line 47)
```
const targetLanguage = localStorage.getItem('onboarding_language') || 'english';
```

---

## File 4: `src/pages/Auth.tsx`

### 4a. Gate student redirect (lines 101-113)
In the `else` branch where student redirect happens (after checking `native_language`), change:
```typescript
// Current: navigate("/app")
// New: check first_lesson_completed
if (!data?.native_language) {
  navigate("/onboarding");
} else if (localStorage.getItem('first_lesson_completed') !== 'true') {
  navigate("/lesson/first");
} else {
  navigate("/app");
}
```

Apply the same pattern in the sign-in success block (line 280):
```typescript
navigate(!profile?.native_language ? "/onboarding" : 
  localStorage.getItem('first_lesson_completed') !== 'true' ? "/lesson/first" : "/app");
```

---

## File 5: `src/pages/AuthCallback.tsx`

### 5a. Gate student redirect (lines 162-169)
In the student redirect branch, after checking `native_language` and `pendingToken`, add first-lesson gating:
```typescript
if (!profile?.native_language) {
  navigate("/onboarding", { replace: true });
} else if (pendingToken) {
  localStorage.removeItem("pending_lesson_token");
  navigate(`/lesson/student/${pendingToken}`, { replace: true });
} else if (localStorage.getItem('first_lesson_completed') !== 'true') {
  navigate("/lesson/first", { replace: true });
} else {
  navigate("/app", { replace: true });
}
```

---

## Summary

| # | File | Changes |
|---|------|---------|
| 1 | `src/pages/Onboarding.tsx` | English-only target, browser native prefill, return-to-first-lesson, set first_lesson_completed=false |
| 2 | `src/pages/FirstLesson.tsx` | English fallback, missing-param redirect, set first_lesson_completed=true, Change level button |
| 3 | `src/components/lesson/LessonExercises.tsx` | English fallback |
| 4 | `src/pages/Auth.tsx` | first_lesson_completed gating for students |
| 5 | `src/pages/AuthCallback.tsx` | first_lesson_completed gating for students |

5 files, 0 new files, 0 architecture changes.

