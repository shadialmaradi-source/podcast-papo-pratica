

# Plan: Fix Video Not Showing in YouTubeVideoExercises

## Problem

The YouTube IFrame API player (`new window.YT.Player(element, ...)`) replaces the target DOM element with an iframe. When the component re-renders or the effect cleanup destroys the player, React's ref points to a stale/removed element, so the player cannot be recreated. The video area appears blank.

## Fix

In `src/components/YouTubeVideoExercises.tsx`:

1. **Use a stable string ID** instead of a ref for the player container div. The YT.Player constructor works more reliably with a string element ID. Give the div a stable `id` like `yt-player-{videoId}`.

2. **Guard against double-initialization**: The `createPlayer` function checks `playerRef.current` but after destroy + re-render, the div is gone. Add a check that the DOM element actually exists via `document.getElementById(...)` before creating the player.

3. **Ensure cleanup properly resets**: After `playerRef.current.destroy()`, the iframe is removed but the original div is not restored by React until re-render. Add a key prop to force React to recreate the container div when videoData changes.

### Concrete changes (single file)

**`src/components/YouTubeVideoExercises.tsx`**:
- Replace `<div ref={playerContainerRef} className="w-full h-full" />` with `<div id={playerContainerId} className="w-full h-full" />`  
- Use `const playerContainerId = \`yt-player-${videoId}\`` 
- In `createPlayer()`: use `document.getElementById(playerContainerId)` check instead of ref
- Pass the string ID to `new window.YT.Player(playerContainerId, {...})`
- Add a `key={videoData.video_id}` on the container div to force React to recreate it after cleanup

