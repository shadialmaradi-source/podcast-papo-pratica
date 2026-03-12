

# Streamlined Lesson Flow: Skip Intermediate Page, Auto-Level, Scene Transcript

## Summary of Changes

The user wants 4 things:
1. **Back button** on the scene-video page to go back to library
2. **Skip the intermediate page** (`YouTubeVideoExercises` with full video + transcript + 3 level buttons) — go directly from library click to the scene-video view (screenshot 3)
3. **Add scene-only transcript** below the video player (with explore/save flashcard features), remove the Subtitles button
4. **Auto-detect difficulty level** from onboarding (`onboarding_level` in localStorage or profile `current_level`). If missing, show a popup to select level and save it globally.

## Level Mapping

Onboarding stores: `absolute_beginner`, `beginner`, `intermediate`, `advanced`
- `absolute_beginner` / `beginner` → exercise level `beginner`
- `intermediate` → `intermediate`  
- `advanced` → `advanced`

## Files to Change

### 1. `src/pages/Lesson.tsx` — Major restructuring

**Remove** the `"select-level"` state that renders `YouTubeVideoExercises`.

**New flow on mount:**
1. Load video data (DB ID, YouTube ID, transcript)
2. Resolve user level from: profile `current_level` → localStorage `onboarding_level` → show popup
3. If level found: set `selectedLevel`, call `trySegmentVideo` automatically → show "Preparing your lesson..." screen → enter `scene-video`
4. If level missing: show a level-selection popup/dialog (beginner/intermediate/advanced), save choice to both localStorage and profile, then proceed

**Add state:**
- `showLevelPopup: boolean` — controls the missing-level dialog
- `videoTranscript: string` — full transcript loaded from DB
- `videoTitle: string` — for TranscriptViewer
- `videoLanguage: string` — for TranscriptViewer

**Back button:** In `scene-video` state and all per-scene states, the back button navigates to `/library`.

**Scene transcript:** In the `scene-video` state, below `LessonVideoPlayer`, render a `TranscriptViewer` component with only the current scene's transcript (`currentScene.scene_transcript`).

### 2. `src/components/lesson/LessonVideoPlayer.tsx` — Remove Subtitles button

Remove the Subtitles toggle button from the UI. Keep the speed selector and time display.

### 3. New: Level Selection Dialog

A simple dialog/modal with 3 buttons (Beginner, Intermediate, Advanced) that:
- Saves to `localStorage.setItem('onboarding_level', level)`
- Updates `profiles.current_level` in Supabase
- Closes and proceeds with lesson

This can be inline in `Lesson.tsx` using a Dialog component.

### 4. `src/pages/Lesson.tsx` — Scene-video rendering

Add `TranscriptViewer` below the video player inside the `scene-video` state, passing `currentScene.scene_transcript` as the transcript prop. This gives explore/save flashcard functionality scoped to the current scene only.

## Flow Diagram

```text
Library → Click video → "Preparing your lesson..." loading screen
  → (resolve level from profile/localStorage)
  → (if missing level → popup → save globally)
  → (segment video)
  → Scene 1 Video (0:00-0:59) + Scene Transcript below
  → Continue to Exercises → Multiple Choice
  → Speaking
  → Flashcards
  → Next Scene button → Scene 2 Video...
  → ... → Complete
```

## What stays the same
- `YouTubeExercises`, `YouTubeSpeaking`, `VideoFlashcards` components unchanged
- `SceneNavigator` sidebar unchanged
- Scene progress persistence unchanged
- Non-segmented videos (< 2min) skip scene-video, go to exercises directly

