

# Plan: Fix Onboarding UI + Add Real Lesson Trial for Teachers

## Part 1: Fix Tooltip Overlapping Issues

### Problem
Tooltips use absolute/relative positioning that causes them to overlap the interactive content the user needs to click (visible in screenshot: DemoTooltip covers the "YouTube / Video Link" card).

### Fixes

**`src/components/teacher/DemoTooltip.tsx`**
- Change from `absolute` overlay to a **static inline block** rendered below content. Remove `absolute z-50` positioning entirely. Render as a `relative mt-4` div so the tooltip sits beneath the demo cards, never covering them. Keep the arrow pointing up toward the content.

**`src/pages/AppHome.tsx`**
- Move the two hint tooltips from `absolute -bottom-20` (which overlaps the neighboring card) to a **single consolidated banner below the grid** (`relative mt-4`). Combine both messages into one hint card with a "Got it" dismiss button. Remove the separate `pt-16` "Got it" button section.

**`src/components/library/LibraryTourTooltip.tsx`**
- On mobile, change `fixed bottom-4` to `fixed top-4` so the tooltip doesn't cover the video cards at the bottom of the screen.

**`src/components/transcript/TranscriptTutorial.tsx`**
- For floating tooltips (`position: 'top'`), shift from `top-4` to `top-16` to clear the video player controls. No other changes needed — it already uses `pointer-events-none` on the backdrop.

---

## Part 2: Add Real Lesson Trial to Teacher Onboarding

### Problem
The current teacher onboarding (Step 3) is a simulated walkthrough with fake data. Teachers never experience the actual student lesson flow (video + transcript + exercises + flashcards) so they don't understand what their students will see.

### Solution
After the existing demo walkthrough (or replacing the celebration step), add a **Step 4: "Try a Real Lesson"** that navigates the teacher to `/lesson/first` — the same First Lesson that students experience. This uses pre-loaded content (no API calls needed) and gives the teacher a hands-on experience of the video player, interactive transcript, exercises, speaking, and flashcards.

### Changes

**`src/pages/TeacherOnboarding.tsx`**
- Add step 3 (total steps: 0-3 instead of 0-2). After the demo walkthrough completes, show a new card: "Experience a lesson as your student would" with a CTA button.
- Update step indicators from `[0,1,2]` to `[0,1,2,3]`.
- Step 3 card: icon (Play), title "Try a Real Lesson", description "See exactly what your students experience — watch a video, explore the transcript, and complete exercises.", two buttons: "Try it now" (navigates to `/lesson/first?from=teacher-onboarding`) and "Skip & go to dashboard".

**`src/pages/FirstLesson.tsx`**
- Detect `?from=teacher-onboarding` query param. When lesson completes, instead of navigating to `/onboarding` or `/app`, redirect back to `/teacher` and mark teacher onboarding as completed. Show a small banner "You're previewing as a student" at the top.

**`src/components/teacher/TeacherDemoWalkthrough.tsx`**
- Change `onComplete` callback on the celebration step (step 6) to signal "advance to trial step" instead of finishing onboarding entirely. The parent (`TeacherOnboarding`) handles routing to step 3.

### Flow
```text
Step 0: Profile → Step 1: Add Student → Step 2: Demo Walkthrough → Step 3: Real Lesson Trial → Dashboard
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/teacher/DemoTooltip.tsx` | Static inline positioning instead of absolute overlay |
| `src/pages/AppHome.tsx` | Consolidated hint banner below grid |
| `src/components/library/LibraryTourTooltip.tsx` | Mobile: top instead of bottom |
| `src/components/transcript/TranscriptTutorial.tsx` | Top tooltips shifted down to clear controls |
| `src/pages/TeacherOnboarding.tsx` | Add step 3 "Try a Real Lesson" card |
| `src/pages/FirstLesson.tsx` | Handle `?from=teacher-onboarding` redirect + preview banner |
| `src/components/teacher/TeacherDemoWalkthrough.tsx` | Celebration step signals parent instead of completing |

