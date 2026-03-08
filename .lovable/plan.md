

# Plan: Interactive Teacher Demo Walkthrough

## Summary

Replace the current static "tour slides" (Step 3 of onboarding) with a fully interactive guided demo that walks teachers through creating a lesson step-by-step using the real dashboard UI -- but with pre-filled/fake data so nothing actually hits the backend. Popup tooltips guide each action, similar to the existing `TranscriptTutorial` pattern used for students.

## How It Works

After completing Steps 1-2 (profile + student), instead of showing 3 static slides, the teacher lands on a **demo version of the dashboard** with a guided overlay system. The demo auto-advances through each step of lesson creation:

1. **"Create a Lesson"** -- tooltip points at the card, teacher clicks it
2. **"Choose YouTube"** -- tooltip points at the YouTube option
3. **"Pick from Community"** -- tooltip highlights the community browser option
4. **Pre-filled form** -- form auto-fills with demo data (URL, level, language), tooltip says "This is where you configure the lesson"
5. **"Create Lesson"** -- tooltip points at the submit button, fake submit shows a mock share link
6. **"Share with students"** -- tooltip highlights the share link with copy button
7. **"Done!"** -- final celebration card, button to go to real dashboard

Each step has a floating tooltip (reusing the same visual style as `TranscriptTutorial`) with a skip option.

## Architecture

### New Component: `TeacherDemoWalkthrough.tsx`

- Receives `onComplete` and `onSkip` callbacks
- Manages a `demoStep` state machine (7 steps)
- Renders a **fake** version of the dashboard UI (simplified, non-functional copies of the key screens)
- Each step shows a `DemoTooltip` pointing at the relevant element
- No real Supabase calls -- everything is mocked inline
- Uses `framer-motion` for transitions between steps

### New Component: `DemoTooltip.tsx`

- Reusable floating tooltip with: title, description, optional action button, skip link
- Positioned relative to a target element (top/bottom/center)
- Same visual style as `TranscriptTutorial` floating tooltips
- Auto-shows skip after 3 seconds

### Modify: `TeacherOnboarding.tsx`

- Step 2 (`handleStep2Next`) now transitions to `step === 2` which renders `TeacherDemoWalkthrough` instead of the static tour slides
- `onComplete` from the demo calls `handleComplete()` (marks onboarding done)
- `onSkip` also calls `handleComplete()`

### Demo Steps Detail

| Step | What's shown | Tooltip message |
|------|-------------|----------------|
| 0 | Dashboard home (fake) | "This is your dashboard. Tap 'Create a Lesson' to start!" |
| 1 | Lesson type selector (fake) | "Choose the type of lesson. Let's try YouTube!" |
| 2 | YouTube source selector (fake) | "You can paste any URL or browse our library" |
| 3 | Pre-filled form | "Configure level, language, and exercises. We've filled this for you!" |
| 4 | Mock "creating..." then result | "Your lesson is ready! AI generated exercises automatically." |
| 5 | Share link + exercise preview | "Copy this link and send it to your student. That's it!" |
| 6 | Celebration screen | "You're all set! Let's go to your real dashboard." |

## Files Changed

| File | Change |
|------|--------|
| `src/components/teacher/DemoTooltip.tsx` | New -- reusable guided tooltip component |
| `src/components/teacher/TeacherDemoWalkthrough.tsx` | New -- full interactive demo with fake dashboard screens |
| `src/pages/TeacherOnboarding.tsx` | Modified -- Step 3 renders `TeacherDemoWalkthrough` instead of static slides |

## Key Decisions

- **No real API calls** during the demo -- all data is hardcoded/mocked to avoid creating junk data
- **Reuses visual patterns** from the real dashboard (Cards, icons, layout) so teachers recognize the UI when they arrive at the real thing
- **localStorage flag** (`teacher_demo_completed`) as backup to not re-show
- **Skip always available** after 3 seconds on each step

