

# Fix: Add Scene Segmentation to Post-Creation View

## Problem
After creating a YouTube lesson, the teacher sees `LessonPostCreationView` which renders a raw `<iframe>`. The scene segmentation was only added to `TeacherLesson.tsx` (the `/teacher/lesson/:id` page), not this post-creation component.

## Solution

### File: `src/components/teacher/LessonPostCreationView.tsx`

1. **Add imports**: `useState`, `useEffect` from React; `supabase` client; `SceneNavigator` + `VideoScene` type; `LessonVideoPlayer`; `Loader2` (already imported).

2. **Add scene state** inside the component:
   - `scenes: VideoScene[]`, `currentSceneIndex: number`, `completedScenes: number[]`, `scenesLoading: boolean`

3. **Add `useEffect`** that triggers when `youtubeVideoId` is available:
   - Query `youtube_videos` by `video_id = youtubeVideoId` to get the DB UUID
   - Call `supabase.functions.invoke("segment-video-scenes", { body: { videoId } })`
   - Set `scenes` from the response
   - This is the same pattern already working in `TeacherLesson.tsx` lines 187-231

4. **Replace the `<iframe>` block** (lines 180-190) with conditional rendering:
   - If `scenesLoading`: show a loading skeleton
   - If `scenes.length > 0`: render `SceneNavigator` sidebar + `LessonVideoPlayer` with `startTime`/`duration` from the current scene, plus the scene transcript text below
   - If no scenes: fall back to the existing `<iframe>` (for very short videos under 2 minutes)

5. **Scene navigation handlers**: `onSceneSelect` updates `currentSceneIndex`; completing a scene adds it to `completedScenes`

No other files need changes — `CreateLessonForm.tsx` already passes `lessonYoutubeUrl` which provides the YouTube URL needed.

