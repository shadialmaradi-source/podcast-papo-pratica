

# Plan: Fix Video Not Appearing on Mobile in Lesson Page

## Problem
When clicking a community video on mobile, the YouTube player div renders but the IFrame API player never initializes, leaving a blank white area. This is caused by a race condition in `YouTubeVideoExercises.tsx`: if the YouTube IFrame API was already loaded from a prior page visit, `window.onYouTubeIframeAPIReady` never fires again, and the `createPlayer` call may silently fail if the DOM element isn't ready or the player encounters a mobile-specific issue.

## Solution
Add a fallback mechanism: if the YT.Player doesn't initialize within 3 seconds, replace it with a standard `<iframe>` embed (which works reliably on all mobile browsers). Also add a `setTimeout(createPlayer, 100)` retry to handle DOM timing issues.

## Changes

### `src/components/YouTubeVideoExercises.tsx`
1. **Add fallback state**: `const [playerFailed, setPlayerFailed] = useState(false)`
2. **Add initialization timeout**: After calling `createPlayer()`, set a 3-second timeout. If `playerRef.current` is still null or hasn't fired `onReady`, set `playerFailed = true`.
3. **Retry with delay**: Wrap `createPlayer()` in a small `requestAnimationFrame` or `setTimeout(…, 0)` to ensure the DOM element exists.
4. **Render fallback iframe**: If `playerFailed`, render a standard `<iframe src="https://www.youtube.com/embed/${videoData.video_id}">` instead of the YT.Player div. This loses time-polling but at least shows the video.
5. **Fix `onYouTubeIframeAPIReady` race**: If `window.YT?.Player` already exists, still use `setTimeout(createPlayer, 0)` to ensure the div is in the DOM.

### Files to modify:
- `src/components/YouTubeVideoExercises.tsx` — add fallback iframe and initialization retry logic

