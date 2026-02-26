

# Fix Curated Learning Path: Skip Level Picker & Force Beginner Exercises

## Issues

1. **3-level picker shown in curated path** — `YouTubeVideoExercises` renders beginner/intermediate/advanced buttons even when `source="curated"`. For the curated learning path, the level is always beginner and should auto-start.
2. **Old exercises persist** — `setup-week-video-exercises` skips exercise generation if any exercises already exist for that video. Since exercises were generated before the beginner types were added, old standard exercises are shown instead of the new simplified ones.

## Changes

### 1. Auto-start exercises when `source="curated"`
**File: `src/components/YouTubeVideoExercises.tsx`**

When `source === "curated"`, skip the level selection panel entirely. After loading video data, automatically call `handleStartExercises("beginner")` — which deletes existing exercises and regenerates them with the curated beginner prompt.

Replace the exercise selection panel (lines 350-409) with a conditional: if `source === "curated"`, show a simple "Start Exercises" button that auto-triggers beginner generation, or auto-trigger it on mount after video data loads.

### 2. Force regeneration for curated source in `setup-week-video-exercises`
**File: `supabase/functions/setup-week-video-exercises/index.ts`**

When calling `generate-level-exercises` with `source: 'curated'`, delete existing beginner exercises first before generating new ones. Change the "exercises already exist" check to only skip for non-curated sources — or simply always regenerate for curated.

### 3. Auto-trigger on curated flow
**File: `src/components/YouTubeVideoExercises.tsx`**

Add a `useEffect` that, when `source === "curated"` and `videoData` is loaded, automatically calls `handleStartExercises("beginner")` so the user never sees the level picker. Show only the video, transcript, and a loading spinner while generating.

## Summary

| File | Change |
|------|--------|
| `src/components/YouTubeVideoExercises.tsx` | Auto-start beginner exercises when `source="curated"`, hide level picker |
| `supabase/functions/setup-week-video-exercises/index.ts` | Delete existing beginner exercises before regenerating for curated source |

