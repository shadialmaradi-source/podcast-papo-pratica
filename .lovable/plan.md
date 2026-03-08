

# Plan: Smart "Next Video" Recommendation

## Problem
Clicking "Next Video" on the lesson complete screen just navigates to `/library`. Instead, it should find and navigate to the most similar community video based on the current video's characteristics (duration/short, category, difficulty level).

## Approach
1. **Fetch current video metadata** when lesson completes (category, is_short, difficulty_level)
2. **Query for the best matching community video** excluding the current one and already-watched videos
3. **Navigate directly** to that video's lesson page

## Changes

### 1. `src/pages/Lesson.tsx`
- After the lesson reaches "complete" state, fetch the current video's metadata (category, is_short, difficulty_level) from `youtube_videos`
- Replace `handleNextVideo` to query for a similar community video:
  - Filter: `status = 'ready'`, exclude current videoId, exclude videos linked to `week_videos`
  - Prefer: same `category`, same `is_short`, same `difficulty_level`
  - Order by match score (category match > is_short match > difficulty match), fallback to random
- Navigate to `/lesson/{nextVideoId}` instead of `/library`
- If no match found, fall back to `/library`

### 2. `src/components/lesson/LessonCompleteScreen.tsx`
- Update `onNextVideo` prop to accept async behavior (no interface change needed, just the handler)
- Optionally show a brief loading state on the "Next Video" button while fetching

### Files to modify:
- `src/pages/Lesson.tsx` — add next video recommendation logic in `handleNextVideo`
- `src/components/lesson/LessonCompleteScreen.tsx` — add loading state to Next Video button

