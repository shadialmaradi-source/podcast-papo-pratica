

# Fix: Always pass `scene_id_param` to resolve RPC overload ambiguity

## Problem

There are 3 overloaded versions of `get_youtube_exercises_with_answers` in the database (2-param, 3-param, 4-param). When calling with 3 params (no `scene_id_param`), PostgREST can't disambiguate between the 2-param and 3-param overloads, causing a 400 error for most videos.

## Solution

Two changes:

### 1. `src/components/YouTubeExercises.tsx` — Always pass `scene_id_param: null`

Always include `scene_id_param` in both the primary and fallback RPC calls so PostgREST unambiguously selects the 4-param overload:

```typescript
const rpcParams: any = { 
  video_id_param: videoData.id,
  difficulty_param: dbDifficulty,
  native_language_param: userNativeLanguage,
  scene_id_param: sceneId || null,  // always pass
};
```

Same for the fallback call (~line 337): add `scene_id_param: null`.

### 2. Database migration — Drop the 2-param and 3-param overloads

```sql
DROP FUNCTION IF EXISTS public.get_youtube_exercises_with_answers(uuid, text);
DROP FUNCTION IF EXISTS public.get_youtube_exercises_with_answers(uuid, text, text);
```

This leaves only the 4-param version, preventing future ambiguity. No existing code breaks because all calls will explicitly use 4 params after change #1.

No need to delete any videos — this fix makes all existing videos work.

