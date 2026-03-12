

# Per-Scene Lesson Flow: Watch → Quiz → Speaking → Flashcards → Next Scene

## Current vs Desired Flow

**Current:** Select level → All scene exercises (one after another) → Speaking (whole video) → Flashcards → Complete

**Desired:** Select level → **For each scene:** Watch clip → Exercises → Speaking → Flashcards → "Next Scene" → **Lesson Complete**

Resume: returning to a video starts from the first incomplete scene.

## YouTube Feasibility

The YouTube IFrame API supports `start` and `end` `playerVars`, so restricting playback to e.g. 0:00-0:59 works natively. `LessonVideoPlayer` already accepts `startTime` and `duration` props and configures these parameters.

## Changes

### 1. New lesson state machine in `Lesson.tsx`

Replace the current states with a per-scene loop:

```text
select-level → loading-scenes → [per scene: video → exercises → speaking → flashcards] → complete
```

New state type:
```typescript
type LessonState = "select-level" | "loading-scenes" | "scene-video" | "exercises" | "speaking" | "flashcards" | "complete";
```

- **"scene-video"**: Render `LessonVideoPlayer` with the current scene's `start_time` / `end_time`. On complete → transition to "exercises".
- **"exercises"**: Current `YouTubeExercises` for the scene. On complete → transition to "speaking".
- **"speaking"**: `YouTubeSpeaking` scoped to scene transcript. On complete → transition to "flashcards".
- **"flashcards"**: `VideoFlashcards` for the scene. On complete → mark scene done, advance to next scene's "scene-video" or "complete" if all done.

### 2. Scene video playback

When `lessonState === "scene-video"` and `currentScene` exists, render:
```tsx
<LessonVideoPlayer
  video={{
    youtubeId: videoData.video_id,
    startTime: currentScene.start_time,
    duration: currentScene.end_time - currentScene.start_time,
    suggestedSpeed: 1,
  }}
  onComplete={() => setLessonState("exercises")}
/>
```

For non-segmented videos (under 2 min), skip "scene-video" and go straight to exercises as today.

### 3. Per-scene transitions in `handleFlashcardsComplete`

After flashcards for a scene:
1. Mark scene completed, save progress
2. If more scenes remain → `setCurrentSceneIndex(next)` + `setLessonState("scene-video")`
3. If all scenes done → `setLessonState("complete")`

### 4. Resume from saved progress

Already implemented via `loadSceneProgress` / `user_scene_progress`. On mount, if progress exists, set `currentSceneIndex` to first incomplete scene and start from "scene-video" after level selection.

### 5. `handleExercisesComplete` simplification

Remove the scene-advancement logic from `handleExercisesComplete` — it now just transitions to "speaking". Scene advancement moves to `handleFlashcardsComplete`.

### 6. SceneNavigator placement

Move `SceneNavigator` to be visible during all per-scene states (video, exercises, speaking, flashcards) so students always see their position.

### Files Modified
- **`src/pages/Lesson.tsx`** — Main restructuring (state machine, scene-video state, per-scene loop)
- **`src/components/lesson/LessonVideoPlayer.tsx`** — Minor: remove the "Change level" back button (navigation handled by parent), ensure `end` playerVar uses `startTime + duration`

