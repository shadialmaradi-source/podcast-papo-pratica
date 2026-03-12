

# Fix: Exercises load failure when scene segmentation finds no scene-specific exercises

## Problem
The flow has a timing mismatch:
1. `YouTubeVideoExercises` generates exercises with `scene_id: null` (full-video exercises)
2. Then `Lesson.tsx` calls `trySegmentVideo`, which splits the video into scenes
3. `YouTubeExercises` is rendered with a specific `sceneId` from the detected scene
4. The RPC query filters by that `scene_id`, finds nothing (exercises were stored with `scene_id: null`)
5. Scene exercise generation inside `YouTubeExercises` may also fail silently
6. Result: "Unable to Generate Exercises" error, even though exercises exist in the DB

## Solution
Add a fallback in `YouTubeExercises`: if scene-filtered query returns 0 exercises, retry the RPC **without** the `scene_id_param` to load full-video exercises instead.

## Changes

### `src/components/YouTubeExercises.tsx` (lines ~313-365)
After the RPC query with `scene_id_param`, if `dbExercises` is empty and `sceneId` was provided:
- Retry the RPC without `scene_id_param` (pass `null` or omit it)
- Log a warning that we fell back to full-video exercises
- Continue with the loaded exercises as normal

```
// Pseudocode for the fallback:
if ((!dbExercises || dbExercises.length === 0) && sceneId) {
  console.log('No scene exercises found, falling back to full-video exercises');
  const fallbackParams = { 
    video_id_param: videoData.id, 
    difficulty_param: dbDifficulty, 
    native_language_param: userNativeLanguage 
  };
  const fallbackResult = await supabase.rpc('get_youtube_exercises_with_answers', fallbackParams);
  dbExercises = fallbackResult.data;
  dbError = fallbackResult.error;
}
```

Single file change, ~10 lines added.

