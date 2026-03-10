

# Simplify Teacher Onboarding to 2-Step Quick Start

## Overview

Replace the current 4-step onboarding (profile → student → demo walkthrough → try lesson) with a 2-step quick start: watch a 30-second demo video, then one-click create a demo lesson. Profile setup and student invitations become optional post-onboarding tasks.

## Changes

### 1. New Component: `src/components/teacher/QuickStartOnboarding.tsx`
- Two-step UI: video demo + one-click demo lesson creation
- Step 1: Embedded video placeholder with play button, marks `videoWatched` state
- Step 2: "Create Demo Lesson" button that:
  - Inserts a pre-filled `teacher_lessons` row (youtube type, A2 Spanish, pre-selected URL)
  - Calls `generate-lesson-exercises` edge function
  - Upserts `teacher_profiles` with `onboarding_completed: true`
  - Navigates to `/teacher/lesson/{id}?demo=true`
- Skip link at bottom → navigates to `/teacher`
- Clean, minimal card-based design with step indicators

### 2. Update `src/pages/TeacherOnboarding.tsx`
- Replace entire component body with a redirect to render `QuickStartOnboarding`
- Or simply render `<QuickStartOnboarding />` directly (simpler, avoids new route)

### 3. Update `src/pages/TeacherLesson.tsx`
- Read `?demo=true` from `useSearchParams`
- When present, show a success banner at top with:
  - "Demo Lesson Created!" message
  - "Go to Dashboard" and "Add Your First Student" CTAs

### 4. No routing changes needed
- Keep `/teacher/onboarding` route as-is, just change what it renders
- No new routes required

## Files

| File | Action |
|------|--------|
| `src/components/teacher/QuickStartOnboarding.tsx` | **Create** — new 2-step quick start component |
| `src/pages/TeacherOnboarding.tsx` | **Rewrite** — render QuickStartOnboarding instead of old 4-step flow |
| `src/pages/TeacherLesson.tsx` | **Edit** — add demo success banner when `?demo=true` |

