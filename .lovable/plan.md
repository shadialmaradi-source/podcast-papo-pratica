

# Plan: Smart Scene Segmentation (Trial on Single Video)

## Summary

Add scene segmentation that splits videos longer than 2 minutes into ~60s micro-lessons. Each scene gets its own exercises. Start with a single trial video, then roll out as a standard feature.

## Architecture

### 1. Database: Two New Tables

**`video_scenes`** -- stores AI-generated scene segments per video:
- `id` (uuid PK), `video_id` (FK → youtube_videos), `scene_index` (int), `start_time` (numeric), `end_time` (numeric), `scene_title` (text), `scene_transcript` (text), `created_at` (timestamptz)
- Unique constraint on `(video_id, scene_index)`
- RLS: authenticated can SELECT; service_role can ALL

**`user_scene_progress`** -- tracks per-user resumable progress:
- `id` (uuid PK), `user_id` (uuid), `video_id` (uuid FK → youtube_videos), `current_scene` (int default 0), `completed_scenes` (int[] default '{}'), `last_timestamp` (numeric default 0), `updated_at` (timestamptz)
- Unique constraint on `(user_id, video_id)`
- RLS: users can SELECT/INSERT/UPDATE own rows

**Add column to `youtube_exercises`:**
- `scene_id` (uuid, nullable, FK → video_scenes) -- links exercises to a specific scene

### 2. Edge Function: `segment-video-scenes`

- Input: `{ videoId (DB uuid) }`
- Fetches transcript from `youtube_transcripts` and duration from `youtube_videos`
- If duration <= 120s or no timed transcript, returns empty (no segmentation)
- Uses OpenAI (via LOVABLE_API_KEY) to split the timed transcript into scenes
- AI prompt instructs: split at topic changes, dialogue boundaries, natural pauses, speaker changes, punctuation breaks; target ~60s, min 20s, max 120s; generate a short descriptive title per scene
- Fallback: if AI fails, split by time every 60s at nearest segment boundary
- Inserts scenes into `video_scenes`, returns the array
- Caches: if scenes already exist for the video, returns them without re-generating

### 3. Update `generate-level-exercises` Edge Function

- Accept optional `sceneId` and `sceneTranscript` parameters
- When `sceneId` is provided, save it on the inserted exercises as `scene_id`
- When `sceneTranscript` is provided, use it instead of the full transcript
- No changes to the AI generation prompt itself

### 4. Frontend: Refactor `Lesson.tsx`

Current flow: `select-level` → `exercises` → `speaking` → `flashcards` → `complete`

New flow for segmented videos:
- After level selection, check if video duration > 120s
- If yes, call `segment-video-scenes` (or load cached scenes)
- Track `currentSceneIndex` and `scenes[]` in state
- Per scene: `exercises` → (optional speaking on last scene) → next scene
- After all scenes: `speaking` → `flashcards` → `complete`
- Load/save progress to `user_scene_progress` so user can resume

### 5. New Component: `SceneNavigator.tsx`

Renders a compact scene list shown during exercises:
- Each scene shows: index, title, duration
- Completed scenes: checkmark icon, muted style
- Current scene: highlighted with primary color border
- Future scenes: locked/dimmed
- Clicking a completed/current scene jumps to it (updates `currentSceneIndex`)

### 6. Update `YouTubeVideoExercises.tsx`

- Accept optional `sceneTranscript` and `sceneId` props
- When generating exercises, pass `sceneTranscript` and `sceneId` to `generate-level-exercises`
- Display current scene title in the header

### 7. Update `YouTubeExercises.tsx`

- Accept optional `sceneId` prop
- When loading exercises via `get_youtube_exercises_with_answers`, also filter by `scene_id` if provided
- Requires a small update to the RPC function or a direct query fallback

### 8. Trial Approach

- The segmentation triggers automatically based on video duration (> 120s)
- Pick one existing long video in the library to test with
- No manual configuration needed -- any video > 2 min will auto-segment on first load
- Once validated, it works for all videos by default

## Files Changed

| File | Change |
|---|---|
| Migration SQL | Create `video_scenes`, `user_scene_progress` tables; add `scene_id` column to `youtube_exercises` |
| `supabase/functions/segment-video-scenes/index.ts` | New edge function for AI scene segmentation |
| `supabase/functions/generate-level-exercises/index.ts` | Accept optional `sceneId`/`sceneTranscript`, save `scene_id` on exercises |
| `supabase/config.toml` | Add `segment-video-scenes` function config |
| `src/pages/Lesson.tsx` | Scene-aware lesson flow with multi-scene progression + resume |
| `src/components/lesson/SceneNavigator.tsx` | New scene list UI component |
| `src/components/YouTubeVideoExercises.tsx` | Accept scene props, pass scene transcript to exercise generation |
| `src/components/YouTubeExercises.tsx` | Accept `sceneId`, filter exercises by scene |

## User Flow

1. User opens `/lesson/:videoId` for a 5-minute video
2. Selects difficulty level
3. App calls `segment-video-scenes` → returns 5 scenes with titles
4. Exercises generated for Scene 1 only (using scene transcript)
5. User completes Scene 1 exercises → SceneNavigator updates with checkmark
6. Scene 2 loads automatically → new exercises generated for Scene 2
7. After all scenes: speaking practice → flashcards (full video) → complete
8. If user leaves mid-way, progress is saved in `user_scene_progress`
9. On return, resumes at the last incomplete scene

Videos ≤ 2 minutes keep the current single-lesson behavior unchanged.

