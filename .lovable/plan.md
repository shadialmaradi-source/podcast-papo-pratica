

# Fix Smart Scene Segmentation (End-to-End)

The feature code exists but has never worked. There are **zero scenes** and **zero scene-linked exercises** in the database. Here are the root causes and fixes:

## Problems Found

### 1. `generate-level-exercises` auth uses non-existent `getClaims` method
Line 22 of the edge function calls `authSupabase.auth.getClaims()` which doesn't exist in the Supabase JS client v2. This causes the function to return 401 on every scene exercise generation call. Fix: replace with `authSupabase.auth.getUser()`.

### 2. `youtube_exercises` table has no SELECT RLS policy for authenticated users
The scene-filtered exercise query in `YouTubeExercises.tsx` (line 319-326) does a direct `.select('*')` on `youtube_exercises` filtered by `scene_id`. But the table only has a "Service role full access" policy — no policy for regular authenticated users. The non-scene path works because it uses the `get_youtube_exercises_with_answers` RPC (SECURITY DEFINER). Fix: either add an authenticated SELECT policy, or create a new RPC that accepts `scene_id` as a parameter.

### 3. Edge function `segment-video-scenes` may not be deployed
No logs exist. The function code is present but has never been called successfully. It needs to be redeployed (happens automatically on file save).

## Plan

### Step 1: Fix `generate-level-exercises` auth (edge function)
Replace `getClaims` with `getUser()` in `supabase/functions/generate-level-exercises/index.ts`:
```typescript
const { data: { user }, error: authError } = await authSupabase.auth.getUser();
if (authError || !user) {
  return 401...
}
```

### Step 2: Fix exercise loading for scene-filtered queries
Add an RLS SELECT policy on `youtube_exercises` for authenticated users, OR update the `get_youtube_exercises_with_answers` RPC to accept an optional `scene_id_param`. The RPC approach is safer and consistent. We'll add a new overload or modify the existing function to accept `scene_id_param` (default null).

**Database migration**: Add a new RPC or update existing one to support scene filtering.

### Step 3: Update `YouTubeExercises.tsx` to use the RPC for scene queries too
Instead of direct table query, use the updated RPC with `scene_id_param`.

### Step 4: Redeploy `segment-video-scenes` edge function
Touch the file to trigger redeployment (add a comment or minor formatting change).

### Step 5: Minor fix in `Lesson.tsx` scene transition
The current approach of cycling through `select-level` state to force re-mount (line 265-266) is fragile. Use a proper key-based re-render instead.

## Files to Change
- `supabase/functions/generate-level-exercises/index.ts` — fix auth
- `supabase/functions/segment-video-scenes/index.ts` — ensure deployment
- `src/components/YouTubeExercises.tsx` — use RPC for scene queries
- Database migration — add `scene_id_param` to `get_youtube_exercises_with_answers` RPC
- `src/pages/Lesson.tsx` — improve scene transition logic

