

# Lesson-Flow DB Efficiency Audit

## Current Architecture

The lesson flow (Video → Exercises → Speaking → Flashcards) is rendered by `Lesson.tsx`, which uses `useLessonFlow.ts` for initialization and passes `videoId` (YouTube string ID) down to each step component. Each step component independently resolves data:

```text
useLessonFlow.ts     → youtube_videos (resolveVideoData, custom query)
                     → profiles.current_level
                     → user_scene_progress

useYouTubeExercises  → resolveDbVideoId(videoId)     [videoResolver cache]
                     → resolveTranscriptMeta(dbId)    [videoResolver cache]
                     → profiles.native_language

YouTubeSpeaking      → supabase.auth.getSession()    [redundant]
                     → resolveDbVideoId(videoId)      [videoResolver cache]
                     → resolveTranscriptMeta(dbId)    [videoResolver cache]

VideoFlashcards      → resolveDbVideoId(videoId)      [videoResolver cache, skipped if prop]
                     → resolveTranscriptMeta(dbId)    [videoResolver cache]
                     → supabase.auth.getSession()     [redundant]
                     → profiles.native_language
```

## Confirmed Inefficiencies

### 1. `useLessonFlow.resolveVideoData()` bypasses `videoResolver.ts` cache
- **What**: `useLessonFlow` has its own `resolveVideoData()` that queries `youtube_videos` directly (lines 83-100). It does NOT use `resolveDbVideoId()` from `videoResolver.ts`. So the first video ID resolution is never cached in the shared `videoIdCache`.
- **Result**: When exercises mount next, `useYouTubeExercises` calls `resolveDbVideoId()` — cache miss, another DB read. Same for speaking and flashcards (though those hit the videoResolver cache after exercises populate it).
- **Files**: `src/hooks/useLessonFlow.ts`, `src/utils/videoResolver.ts`
- **Impact**: 1 extra `youtube_videos` read per lesson session. Medium — affects every lesson.
- **Affects**: DB reads, cache miss

### 2. `profiles.native_language` fetched independently by exercises, speaking (via getSession), and flashcards
- **What**: `useYouTubeExercises` fetches `profiles.native_language` (line 188). `VideoFlashcards` fetches `profiles.native_language` (line 73). `YouTubeSpeaking` doesn't fetch native_language from profiles but does call `supabase.auth.getSession()` redundantly (line 124).
- **Files**: `src/hooks/useYouTubeExercises.ts`, `src/components/VideoFlashcards.tsx`
- **Impact**: 2 extra `profiles` reads per lesson. Low-medium — same user, same data.
- **Affects**: DB reads, duplicate state

### 3. `YouTubeSpeaking` calls `supabase.auth.getSession()` instead of using `useAuth()`
- **What**: Line 124 calls `supabase.auth.getSession()` to check auth status and get userId. The component is always rendered inside an authenticated context. `useAuth()` already provides `user`.
- **Files**: `src/components/YouTubeSpeaking.tsx`
- **Impact**: 1 extra auth call per speaking step. Low — `getSession()` is cheaper than `getUser()` but still unnecessary.
- **Affects**: Latency, duplicate state

### 4. `VideoFlashcards` calls `supabase.auth.getSession()` instead of using `useAuth()`
- **What**: Line 66 calls `supabase.auth.getSession()` to get the session for auth. Same issue as speaking.
- **Files**: `src/components/VideoFlashcards.tsx`
- **Impact**: 1 extra auth call per flashcard step. Low.
- **Affects**: Latency, duplicate state

### 5. `useLessonFlow` resolves video metadata but doesn't pass language/dbVideoId efficiently to children
- **What**: `useLessonFlow` already resolves and caches `dbVideoId`, `videoLanguage`. It passes `dbVideoId` to `VideoFlashcards` (as prop), but exercises and speaking still independently call `resolveDbVideoId()`. The `videoResolver` cache handles this after first call, but the first call (exercises) still hits DB because `useLessonFlow` didn't populate the shared cache.
- **Files**: `src/pages/Lesson.tsx`, `src/hooks/useLessonFlow.ts`
- **Impact**: 1 wasted DB read (exercises step). Low — cache serves speaking + flashcards.
- **Affects**: DB reads, cache miss

### 6. Transcript metadata fetched 3 times (exercises, speaking, flashcards) — but cached
- **What**: All three steps call `resolveTranscriptMeta()`. The `videoResolver` cache makes calls 2 and 3 free. Only the first call (exercises) hits DB. This is already efficient.
- **Impact**: None — already cached. Confirmed working correctly.

### 7. `FirstLesson` — no redundancy
- **What**: `FirstLesson` uses hardcoded/Supabase `onboarding_videos` content. Exercises, speaking, flashcards are passed as props from a single fetch. No repeated resolution.
- **Impact**: None — already efficient.

---

## Top 5 Low-Risk Wins

### Win 1: Seed `videoResolver` cache from `useLessonFlow`
**Files**: `src/hooks/useLessonFlow.ts`, `src/utils/videoResolver.ts`
**Fix**: Export a `seedVideoIdCache(youtubeId, dbId)` function from `videoResolver.ts`. Call it in `useLessonFlow.resolveVideoData()` after resolution. This ensures the exercises step gets a cache hit instead of a redundant DB read.
**Saves**: 1 `youtube_videos` read per lesson session
**Risk**: Very low — additive cache seeding

### Win 2: Pass `dbVideoId` as prop to exercises and speaking
**Files**: `src/pages/Lesson.tsx`
**Fix**: `Lesson.tsx` already passes `dbVideoId` to `VideoFlashcards`. Do the same for `YouTubeExercises` and `YouTubeSpeaking`. Update those components to accept an optional `dbVideoId` prop and skip `resolveDbVideoId()` when provided. Combined with Win 1, this eliminates all redundant video ID lookups.
**Saves**: Up to 2 `youtube_videos` reads (exercises + speaking) — though cache already mitigates speaking
**Risk**: Very low — optional prop, fallback preserved

### Win 3: Replace `supabase.auth.getSession()` with `useAuth()` in YouTubeSpeaking
**Files**: `src/components/YouTubeSpeaking.tsx`
**Fix**: Import and use `useAuth()` for `user` and auth status. Remove the `getSession()` effect. Use `user.id` directly.
**Saves**: 1 auth call per speaking step
**Risk**: Very low — component is always rendered in auth context

### Win 4: Replace `supabase.auth.getSession()` with `useAuth()` in VideoFlashcards
**Files**: `src/components/VideoFlashcards.tsx`
**Fix**: Same as Win 3. Use `useAuth()` instead of `getSession()`.
**Saves**: 1 auth call per flashcard step
**Risk**: Very low

### Win 5: Share `native_language` from `useLessonFlow` or a single profile fetch
**Files**: `src/hooks/useLessonFlow.ts`, `src/pages/Lesson.tsx`
**Fix**: `useLessonFlow` already fetches `profiles.current_level`. Extend that query to also select `native_language`. Pass it as a prop to exercises, speaking, and flashcards. Each child skips its own profile fetch when the prop is provided.
**Saves**: 2 `profiles` reads per lesson session (exercises + flashcards)
**Risk**: Low — optional prop pattern, fallback preserved

---

## Minimal Patch Plan

| Priority | Win | Files | Lines | Risk |
|----------|-----|-------|-------|------|
| 1 | Seed videoResolver cache from useLessonFlow | `useLessonFlow.ts`, `videoResolver.ts` | ~8 | Very low |
| 2 | Pass dbVideoId prop to exercises + speaking | `Lesson.tsx`, `YouTubeExercises.tsx`, `YouTubeSpeaking.tsx`, `useYouTubeExercises.ts` | ~15 | Very low |
| 3 | Replace getSession with useAuth in YouTubeSpeaking | `YouTubeSpeaking.tsx` | ~10 | Very low |
| 4 | Replace getSession with useAuth in VideoFlashcards | `VideoFlashcards.tsx` | ~8 | Very low |
| 5 | Share native_language from useLessonFlow | `useLessonFlow.ts`, `Lesson.tsx`, `useYouTubeExercises.ts`, `VideoFlashcards.tsx` | ~20 | Low |

Total: ~60 lines across 7 files. All behavior-preserving.

### Should a shared resolver/helper reduce repeated calls?

**Already exists**: `videoResolver.ts` already serves this role for video ID and transcript metadata, and its caching works correctly across exercises → speaking → flashcards. The gap is that `useLessonFlow` bypasses it. Wins 1-2 close that gap. No new abstraction needed — just wire the existing resolver into the existing flow.

