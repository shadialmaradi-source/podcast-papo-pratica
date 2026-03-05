

# Plan: Switch PostHog to HTTP API + Add Comprehensive Event Tracking

## 1. Rewrite `src/lib/analytics.ts` — Replace SDK with HTTP API

Remove `posthog-js` import. Use `fetch` POST to `https://us.i.posthog.com/capture/` with new API key `phc_p7UUw6GZ8h3JsZmK82XMKt9KTjJ40oqkZ4Un9vtNeRm`.

- `initAnalytics()`: Generate/load anonymous `distinct_id` from localStorage, send `$pageview`
- `identifyUser(userId, email?)`: Store userId as `distinct_id`, send `$identify` event with `$set` properties
- `resetAnalytics()`: Clear stored `distinct_id`, generate new anonymous one
- `trackEvent(event, properties?)`: POST to capture endpoint with stored `distinct_id`
- All calls fire-and-forget (no `await` blocking UI)
- Same exported function signatures — no call-site changes needed

## 2. Remove `posthog-js` from `package.json`

## 3. Add New Tracking Events

All additions are single `trackEvent()` calls at existing handlers/effects. No structural changes.

| File | Event | Trigger |
|------|-------|---------|
| `Onboarding.tsx` | `onboarding_started` | Component mount |
| `Onboarding.tsx` | `onboarding_step_changed` | `setStep()` calls (props: `step_name`) |
| `Onboarding.tsx` | `onboarding_completed` | `handleFinalContinue` (props: `selected_language`, `native_language`, `level`) |
| `FirstLesson.tsx` | `first_lesson_started` | Component mount |
| `AppHome.tsx` | `home_card_clicked` | Card click handlers (props: `card_type: "library"` or `"import"`) |
| `AppHome.tsx` | `import_dialog_opened` | Dialog open (props: `source_page: "home"`) |
| `Library.tsx` | `library_tab_switched` | Tab change (props: `tab`) |
| `Library.tsx` | `import_dialog_opened` | Dialog open (props: `source_page: "library"`) |
| `Lesson.tsx` | `level_selected` | `handleStartExercises` (props: `video_id`, `level`) |
| `YouTubeExercises.tsx` | `exercise_answered` | Answer submission (props: `correct`, `exercise_type`, `question_index`) |
| `YouTubeSpeaking.tsx` | `speaking_started` | Recording begins (props: `video_id`, `level`) |
| `VideoFlashcards.tsx` | `flashcards_started` | Cards loaded (props: `video_id`, `count`) |
| `ProfilePage.tsx` | `profile_viewed` | Component mount |
| `WeekDetail.tsx` | `week_detail_viewed` | Component mount (props: `week_id`) |

## Files Changed
- **`src/lib/analytics.ts`** — full rewrite (fetch-based, new API key)
- **`package.json`** — remove `posthog-js`
- **`src/pages/Onboarding.tsx`** — 3 trackEvent calls
- **`src/pages/FirstLesson.tsx`** — 1 trackEvent call
- **`src/pages/AppHome.tsx`** — 2 trackEvent calls
- **`src/pages/Library.tsx`** — 2 trackEvent calls
- **`src/pages/Lesson.tsx`** — already tracks `video_started`, add `level_selected`
- **`src/components/YouTubeExercises.tsx`** — 1 trackEvent call (per answer)
- **`src/components/YouTubeSpeaking.tsx`** — 1 trackEvent call
- **`src/components/VideoFlashcards.tsx`** — 1 trackEvent call
- **`src/components/ProfilePage.tsx`** — 1 trackEvent call
- **`src/pages/WeekDetail.tsx`** — 1 trackEvent call

No other files need changes — all existing `trackEvent` call sites (auth, premium, exercises complete, etc.) keep working since the function signature is unchanged.

