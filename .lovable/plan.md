

# Fix: Sync Progress Bar with YouTube and Use Proper IFrame API

## Problem
The YouTube postMessage approach is unreliable — YouTube embedded iframes don't consistently send `onStateChange` or `currentTime` messages via `postMessage`. The screenshot confirms: YouTube's red progress line is at 100% but our green bar lags behind and the button stays disabled.

## Solution
Replace the iframe-based approach with the **official YouTube IFrame Player API** (`YT.Player`). This gives us reliable access to `onStateChange` events and `getCurrentTime()` polling. Fallback: unlock after 30 seconds.

## Changes — `src/components/lesson/LessonVideoPlayer.tsx`

1. **Load YouTube IFrame API script** — dynamically inject `https://www.youtube.com/iframe_api` script tag if not already present
2. **Replace `<iframe>` with a `<div id>` container** — use `new YT.Player(divId, { ... })` to create the player programmatically with `events.onStateChange` and `events.onReady`
3. **onStateChange handler** — when `event.data === YT.PlayerState.ENDED` (0), set `canContinue = true` and `progress = 100`
4. **Poll `getCurrentTime()`** — use a `setInterval` every 500ms that calls `player.getCurrentTime()` and `player.getDuration()` to compute real progress percentage. This handles speed changes and seeking automatically
5. **onReady handler** — apply initial playback rate via `player.setPlaybackRate(speed)` 
6. **Speed changes** — call `player.setPlaybackRate()` directly instead of postMessage
7. **Fallback** — reduce from `duration + 5s` to **30 seconds** as the absolute safety net
8. **Remove** the postMessage listener and the old progress interval — no longer needed

Single file change. The key difference is using `YT.Player` programmatically instead of an `<iframe>` tag, which gives us full API access.

