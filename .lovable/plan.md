

# Edge Function Efficiency & Reliability Audit

## Confirmed Inefficiencies

### 1. `generate-lesson-exercises` — Legacy duplicate of `generate-lesson-exercises-by-type`
- **What**: `generate-lesson-exercises` (211 lines) is a legacy edge function that does the same job as `generate-lesson-exercises-by-type` but without deduplication, translation fields, or duration checks. Only called from `LessonList.tsx` via raw `fetch()`.
- **Why it matters**: It re-fetches the transcript from Supadata every time (no check if `lesson.transcript` already exists), deletes all existing exercises before regenerating, and lacks MCQ fingerprinting.
- **Files**: `supabase/functions/generate-lesson-exercises/index.ts`, `src/components/teacher/LessonList.tsx`
- **Impact**: **Cost + correctness** — unnecessary Supadata API call, destroys exercises, no dedup

### 2. `generate-lesson-exercises-by-type` — Re-fetches transcript from Supadata even when stored
- **What**: Line 178 calls `fetchTranscript(lesson.youtube_url)` if `lesson.transcript` is falsy. But this also happens on every new exercise type generation for the same lesson — if the first call stored the transcript, subsequent calls use it. However, the Supadata fetch has no caching and costs per-call.
- **Risk**: Low — transcript is stored after first fetch. But if it fails once, every subsequent type generation will re-attempt Supadata.
- **Impact**: **Cost** — redundant external API call on failure-retry paths

### 3. `analyze-word` — No client-side or server-side cache
- **What**: Every word tap triggers a full AI call. Same word tapped twice = 2 AI calls. Called from `TranscriptViewer`, `FlashcardCreatorModal`, and `useCreateLesson`.
- **Files**: `src/services/wordAnalysisService.ts`, `supabase/functions/analyze-word/index.ts`
- **Impact**: **Cost + latency** — high. Users commonly re-tap the same word. Each call is ~$0.001-0.005 in AI costs plus ~1-3s latency.

### 4. `generate-flashcards` — Sends full transcript even when cached
- **What**: The edge function has DB-level caching (checks `youtube_flashcards` table), but the client always sends the full transcript in the request body (~4KB). If cached, the transcript payload is wasted.
- **Files**: `src/components/VideoFlashcards.tsx`, `supabase/functions/generate-flashcards/index.ts`
- **Impact**: **Latency** — low. Unnecessary payload, but the cache check works correctly.

### 5. `YouTubeVideoExercises.tsx` — Calls `supabase.auth.getUser()` + profile fetch redundantly
- **What**: `handleStartExercises` (line 325) calls `supabase.auth.getUser()` and then fetches `profiles.native_language` — duplicating the same pattern already in `useYouTubeExercises` hook which runs right after.
- **Files**: `src/components/YouTubeVideoExercises.tsx`
- **Impact**: **Latency** — 2 extra DB reads per exercise start

### 6. `extract-speaking-phrases` — No result caching
- **What**: Generates phrases from transcript via AI every time. No DB storage of results. If user navigates away and returns, another AI call fires.
- **Files**: `supabase/functions/extract-speaking-phrases/index.ts`
- **Impact**: **Cost** — medium. Repeated identical AI calls for same video/level.

### 7. `generate-level-exercises` — Transcript sent + re-fetched
- **What**: Client sends transcript in request body. Edge function also fetches transcript from DB if not provided (line 83). The `useYouTubeExercises` hook doesn't send transcript — relies on DB fetch. But `YouTubeVideoExercises.tsx` sends it (line 350). Two callers, inconsistent payload.
- **Impact**: **Low** — the edge function handles both paths, but the inconsistency means the DB fetch path runs unnecessarily when transcript was available client-side.

---

## Top 5 Low-Risk Wins

### Win 1: Client-side word analysis cache
**Files**: `src/services/wordAnalysisService.ts`
**Fix**: Add an in-memory `Map<string, WordAnalysis>` cache keyed by `word:language:nativeLanguage`. Return cached result if found. Clear on page navigation.
**Saves**: Repeated AI calls for same word. Very common user pattern.
**Risk**: Very low — pure client-side memoization

### Win 2: Migrate `LessonList.tsx` from legacy `generate-lesson-exercises` to `generate-lesson-exercises-by-type`
**Files**: `src/components/teacher/LessonList.tsx`
**Fix**: Replace the raw `fetch()` call to `generate-lesson-exercises` with `supabase.functions.invoke("generate-lesson-exercises-by-type", ...)` using the lesson's first exercise type. This gives deduplication, translation fields, and duration checks.
**Saves**: Eliminates destructive regeneration, gains MCQ dedup, stops unnecessary Supadata calls.
**Risk**: Low — `generate-lesson-exercises-by-type` is the actively maintained function

### Win 3: Skip transcript in flashcard request when only checking cache
**Files**: `src/components/VideoFlashcards.tsx`, `supabase/functions/generate-flashcards/index.ts`
**Fix**: Add a 2-phase approach: first call with `checkCacheOnly: true` (no transcript). If cache miss, send second call with transcript. Or simpler: accept that the payload overhead is minor and just document it.
**Alternative simpler fix**: In `generate-flashcards`, move the cache check before reading `req.json()` body — not possible since videoId is in body. Keep as-is; overhead is minimal.
**Saves**: ~4KB payload per cached hit.
**Risk**: Very low

### Win 4: Avoid redundant auth + profile fetch in `YouTubeVideoExercises.handleStartExercises`
**Files**: `src/components/YouTubeVideoExercises.tsx`
**Fix**: The component should use `useAuth()` for user context instead of calling `supabase.auth.getUser()`. The native language fetch duplicates what `useYouTubeExercises` does on the very next render.
**Saves**: 2 DB calls per exercise generation start
**Risk**: Very low

### Win 5: Skip redundant Supadata call in `generate-lesson-exercises-by-type` when transcript exists
**Files**: `supabase/functions/generate-lesson-exercises-by-type/index.ts`
**Fix**: Already partially handled (line 177-178 checks `lesson.transcript`). But ensure the function doesn't call `fetchTranscript` if `lesson.transcript` is already set. Current code is correct — this is confirmed safe. No change needed.
**Replaced with**: Add result caching to `extract-speaking-phrases` — store results in a `speaking_phrases` table or at minimum cache client-side.

---

## Minimal Patch Plan

| Priority | Win | Files | Lines | Risk |
|----------|-----|-------|-------|------|
| 1 | Client-side word analysis cache | `wordAnalysisService.ts` | ~15 | Very low |
| 2 | Migrate LessonList to by-type function | `LessonList.tsx` | ~10 | Low |
| 3 | Remove redundant getUser in YouTubeVideoExercises | `YouTubeVideoExercises.tsx` | ~12 | Very low |
| 4 | Client-side speaking-phrases cache | `src/components/lesson/LessonSpeaking.tsx` or caller | ~10 | Very low |
| 5 | (Optional) Deprecate `generate-lesson-exercises` edge function | Config only | ~2 | Low |

Total: ~50 lines across 3-4 files. All behavior-preserving.

