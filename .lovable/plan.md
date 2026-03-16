

# Segmented-Lesson Consistency Stabilization — 5 Files

## 1. `src/pages/Lesson.tsx` — Propagate scene context to speaking and flashcards

**Lines 187-201**: Pass `sceneId`, `sceneTranscript`, and `dbVideoId` to `YouTubeSpeaking` and `VideoFlashcards` in segmented branches.

```tsx
// Speaking (line 189)
<YouTubeSpeaking videoId={videoId} level={selectedLevel} onComplete={flow.handleSpeakingComplete} onBack={handleBackToLibrary}
  sceneId={currentScene?.id} sceneTranscript={currentScene?.scene_transcript} />

// Flashcards (line 197)
<VideoFlashcards videoId={videoId} level={selectedLevel} onComplete={() => handleFlashcardsComplete()} onBack={handleBackToLibrary}
  sceneTranscript={currentScene?.scene_transcript} dbVideoId={dbVideoId} />
```

Same props for non-segmented branches (values will be undefined, components use them conditionally).

---

## 2. `src/components/YouTubeSpeaking.tsx` — Accept and use scene context

**Props (line 48-53)**: Add optional `sceneId?: string` and `sceneTranscript?: string`.

**`loadData` (lines 134-207)**: When `sceneTranscript` is provided, skip the full transcript DB fetch and use `sceneTranscript` directly. Still resolve video record for language detection, but set `transcript` from the prop. For beginner mode, pass scene transcript to `extract-speaking-phrases`.

```typescript
// If sceneTranscript is provided, use it directly instead of fetching full transcript
const actualTranscript = sceneTranscript || transcriptData.transcript;
setTranscript(actualTranscript);
// Use actualTranscript when invoking extract-speaking-phrases
```

---

## 3. `src/components/VideoFlashcards.tsx` — Accept scene context and fix transcript resolution

**Props (line 11-16)**: Add optional `sceneTranscript?: string` and `dbVideoId?: string | null`.

**`fetchFlashcards` (lines 36-51)**: 
- If `sceneTranscript` is provided, skip DB transcript fetch and use it directly.
- Resolve DB video ID: use `dbVideoId` prop if available, otherwise look up via `youtube_videos` table (like YouTubeSpeaking does), then query `youtube_transcripts` by DB video ID instead of raw `videoId`.

```typescript
// Resolve DB video ID first
let resolvedDbVideoId = dbVideoId;
if (!resolvedDbVideoId) {
  let { data: videoData } = await supabase.from('youtube_videos').select('id').eq('video_id', videoId).single();
  if (!videoData) {
    const { data: byId } = await supabase.from('youtube_videos').select('id').eq('id', videoId).single();
    videoData = byId;
  }
  resolvedDbVideoId = videoData?.id || null;
}

// Use scene transcript or fetch from DB using resolved ID
let transcript, transcriptLanguage;
if (sceneTranscript) {
  transcript = sceneTranscript;
  // Get language from video record
} else {
  // Fetch from youtube_transcripts using resolvedDbVideoId
}
```

---

## 4. `src/hooks/useYouTubeExercises.ts` — Strict scene alignment

**Lines 265-278**: When `sceneId` is present, do NOT fall back to full-video exercises. Remove the `fetchExercises(null)` fallback when `sceneId` exists.

```typescript
dbExercises = await fetchExercises(sceneId || null);
if (dbExercises.length === 0) {
  if (sceneId) {
    await generateExercises(sceneId, sceneTranscript);
    dbExercises = await fetchExercises(sceneId);
    // If still empty, surface error — do NOT fall back to full-video
    if (dbExercises.length === 0) {
      setError("Could not generate exercises for this scene. Please try again.");
      setIsLoading(false);
      return;
    }
  } else {
    await generateExercises();
    dbExercises = await fetchExercises(null);
  }
}
```

---

## 5. `src/hooks/useLessonFlow.ts` — Fix stale completedScenes in resume

**Problem**: `loadSceneProgress` sets `completedScenes` via `setState`, but `trySegmentVideo` reads `completedScenes` (line 173) synchronously — the state hasn't committed yet, so it's always `[]` on reload.

**Fix**: Make `loadSceneProgress` return the loaded progress, pass it into `trySegmentVideo`, and use it directly.

```typescript
const loadSceneProgress = async (videoDbId: string): Promise<{ currentScene: number; completed: number[] }> => {
  // ... same query ...
  if (progress) {
    setCurrentSceneIndex(progress.current_scene);
    setCompletedScenes(progress.completed_scenes || []);
    return { currentScene: progress.current_scene, completed: progress.completed_scenes || [] };
  }
  return { currentScene: 0, completed: [] };
};

const trySegmentVideo = async (videoDbId: string, _level: string, persistedCompleted: number[]) => {
  // ... line 172-174:
  const firstIncomplete = data.scenes.findIndex(
    (s: VideoScene) => !persistedCompleted.includes(s.scene_index)
  );
  // ...
};

const initLesson = async () => {
  // ...
  const progress = await loadSceneProgress(videoData.id);
  // ...
  await trySegmentVideo(videoData.id, level, progress.completed);
};
```

Same change in `handleLevelSelect` — pass current `completedScenes` (or empty for first visit).

---

## Summary

| File | Change |
|------|--------|
| `Lesson.tsx` | Pass `sceneId`/`sceneTranscript`/`dbVideoId` to speaking + flashcards |
| `YouTubeSpeaking.tsx` | Accept scene props; use scene transcript when provided |
| `VideoFlashcards.tsx` | Accept scene props; resolve DB video ID before transcript query |
| `useYouTubeExercises.ts` | Remove full-video fallback when `sceneId` is present |
| `useLessonFlow.ts` | Return progress from `loadSceneProgress`; pass to `trySegmentVideo` |

5 files, minimal changes, no architecture redesign.

