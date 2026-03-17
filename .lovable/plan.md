

# Lesson-Flow Efficiency Patch — 4 Changes

## 1. Shared video resolution helper (`src/utils/videoResolver.ts` — new file)

Create a tiny utility that resolves DB video ID from route/video input, with a simple in-memory session cache to avoid repeated lookups within one lesson session.

```typescript
// Tries video_id column first, then id column. Caches result for session.
export async function resolveDbVideoId(videoId: string): Promise<string | null>
```

Also add a transcript metadata resolver that caches language + transcript:

```typescript
export async function resolveTranscriptMeta(dbVideoId: string): Promise<{ language: string; transcript: string } | null>
```

Both use a simple `Map` cache (module-level, cleared on page navigation naturally). No new system — just two exported async functions with a local Map.

Reuse in:
- `useYouTubeExercises.ts` — replace lines 207-219 (video lookup) and 226-233 (transcript language lookup)
- `YouTubeSpeaking.tsx` — replace lines 143-155 (video lookup) and 168-186 (transcript fetch)
- `VideoFlashcards.tsx` — replace lines 40-48 (video lookup) and 54-80 (transcript fetch)

## 2. useYouTubeExercises auth optimization

Lines 146, 168, 188: Replace `supabase.auth.getUser()` calls in `saveProgress`, `deleteProgress`, and `loadExercises` with the already-available `user` from `useAuth()` (line 123).

- `saveProgress`: use `user?.id` instead of `(await supabase.auth.getUser()).data.user`
- `deleteProgress`: same
- `loadExercises`: use `user?.id` for profile fetch instead of calling `getUser()` first

This removes 3 network round-trips per lesson session.

## 3. ProfilePage duplicate profile fetch reduction

Currently:
- `loadProfileData()` fetches profile (line 284)
- `loadLearningPathData()` depends on `profile` state (line 184) via a second `useEffect`

The profile is fetched once, but the learning path data load is triggered by a separate effect after profile state updates. This is fine structurally — no duplicate profile fetch exists.

However, `loadLearningPathData` waits for `profile` via `useEffect([user, profile])`. Instead, call `loadLearningPathData` directly at the end of `loadProfileData` after `setProfile(profileData)`, passing `profileData` as a parameter. This avoids the extra render cycle and the separate effect.

```typescript
const loadLearningPathData = async (profileOverride?: UserProfile) => {
  const p = profileOverride || profile;
  if (!user || !p) return;
  const tier = cefrToTier(p.current_level);
  const lang = p.selected_language || 'english';
  // ... rest unchanged
};
```

Then in `loadProfileData`, after `setProfile(profileData)`:
```typescript
loadLearningPathData(profileData);
```

Remove the `useEffect([user, profile])` that calls `loadLearningPathData`.

## Summary

| File | Change |
|------|--------|
| `src/utils/videoResolver.ts` (new) | Shared resolveDbVideoId + resolveTranscriptMeta with Map cache |
| `src/hooks/useYouTubeExercises.ts` | Use shared resolver; use `user` from useAuth instead of getUser() |
| `src/components/YouTubeSpeaking.tsx` | Use shared resolver for video + transcript lookup |
| `src/components/VideoFlashcards.tsx` | Use shared resolver for video + transcript lookup |
| `src/components/ProfilePage.tsx` | Call loadLearningPathData directly from loadProfileData; remove extra effect |

5 files, minimal changes, same behavior, fewer Supabase reads per lesson session.

