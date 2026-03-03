

# Fix: Unlock "Continue" Button Based on Actual YouTube Playback State

## Problem
The "Continue to Exercises" button currently unlocks after a hardcoded `video.duration * 1000` ms timer. If the actual YouTube video is shorter than the `duration` value stored in the database (e.g., 42s video vs 60s timer), the user is stuck waiting. The progress bar also doesn't reflect reality.

## Solution
Listen to YouTube IFrame API `onStateChange` events via `window.addEventListener('message', ...)`. YouTube posts messages when the player state changes — state `0` means the video has **ended**. When we receive that event, immediately unlock the button and set progress to 100%.

Also keep the timer as a fallback (in case the message event doesn't fire), but set it to `video.duration + 5` seconds as a safety net rather than the primary unlock mechanism.

## Changes

### `src/components/lesson/LessonVideoPlayer.tsx`
- Add a `window.addEventListener('message', handler)` that listens for YouTube's `onStateChange` events
- When `event.data` contains `info.playerState === 0` (ended), set `canContinue = true` and `progress = 100`
- Keep the existing timer as a fallback but extend it slightly beyond the video duration
- Update progress bar to also respond to actual playback time from YouTube messages (YouTube posts `info.currentTime` in `onStateChange` events)

Single file change, ~20 lines added.

