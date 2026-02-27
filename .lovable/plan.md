

# Fix: Let Users Watch Video Before Starting Exercises in Curated Path

## Problem
The `useEffect` on line 70-75 of `YouTubeVideoExercises.tsx` auto-triggers `handleStartExercises('beginner')` as soon as video data loads for curated sources. This skips the video player and transcript, jumping straight to exercise generation.

## Change

**File: `src/components/YouTubeVideoExercises.tsx`**

1. **Remove the auto-start `useEffect`** (lines 69-75) — delete the curated auto-start logic and the `curatedAutoStarted` ref (line 63).

2. **Replace the level picker section for curated source** — instead of showing 3 level buttons OR auto-starting, show the video + transcript normally with a single prominent "Start Exercises" button below. When `source === 'curated'`, render:
   - The video player and transcript (already rendered above)
   - A single large button: "Practice with Exercises" that calls `handleStartExercises('beginner')`
   - Hide the 3-level picker entirely

This way users arrive at the video page, watch the video, read the transcript, and only start exercises when they explicitly tap the button.

