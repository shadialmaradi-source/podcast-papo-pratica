

# Supabase DB Efficiency Audit — Confirmed Redundancies

## Confirmed Inefficiencies

### 1. `useLessonFlow.ts` — Repeated `youtube_videos` lookups for same video
- **What**: `resolveVideoData()` fetches video metadata (line 73). Then `trySegmentVideo()` fetches the same video's `duration` again (line 148). Then `markAssignmentInProgress` and `markAssignmentCompleted` each fetch `video_id` from the same row again (lines 225, 242).
- **Why redundant**: The initial `resolveVideoData()` already returns `id, video_id, title, language, duration`. The subsequent 3 reads are subsets of that same row.
- **Files**: `src/hooks/useLessonFlow.ts`
- **Impact**: **Medium** — 3 extra DB reads per lesson session
- **Affects**: DB reads, latency

### 2. `useLessonFlow.ts` — Repeated `supabase.auth.getUser()` calls
- **What**: `loadSceneProgress` (line 106), `saveSceneProgress` (line 127), `markAssignmentInProgress` (line 223), `markAssignmentCompleted` (line 240) each call `supabase.auth.getUser()` independently.
- **Why redundant**: The hook already has `user` from `useAuth()` context. `getUser()` makes a network call to Supabase auth server each time.
- **Files**: `src/hooks/useLessonFlow.ts`
- **Impact**: **Medium** — 4 extra auth API calls per lesson session
- **Affects**: DB reads (auth server), latency

### 3. `Library.tsx` — Double profile fetch for `selected_language`
- **What**: `fetchUserLanguage` effect (line 141) reads `profiles.selected_language`. Then `handleImportVideo` (line 222) reads `profiles.selected_language` again.
- **Why redundant**: The language was already fetched and stored in `userLanguage` state.
- **Files**: `src/pages/Library.tsx`
- **Impact**: **Low** — 1 extra read only on import action
- **Affects**: DB reads, duplicate state

### 4. `AppHome.tsx` + `AppHeader.tsx` — Parallel duplicate profile fetches on app load
- **What**: `AppHome.fetchProfile` (line 154) reads `profiles.full_name, avatar_url, current_streak, total_xp, selected_language`. `AppHeader.fetchProfile` (line 44) reads `profiles.full_name, avatar_url, selected_language`. Both fire on mount when navigating to `/app`.
- **Why redundant**: Same user profile queried twice simultaneously by parent page and header.
- **Files**: `src/pages/AppHome.tsx`, `src/components/AppHeader.tsx`
- **Impact**: **Medium** — 2 reads every time student opens home
- **Affects**: DB reads, duplicate state initialization

### 5. `useAuth.tsx` + `useUserRole.tsx` + `useRoleGuard.ts` — Triple role lookup
- **What**: `useAuth` fetches `user_roles.role` on sign-in (line 40). `useUserRole` fetches the same (line 27). `useRoleGuard` fetches the same (line 22). On teacher pages, all three fire.
- **Why redundant**: The role is immutable during a session. Three independent hooks query it.
- **Files**: `src/hooks/useAuth.tsx`, `src/hooks/useUserRole.tsx`, `src/hooks/useRoleGuard.ts`
- **Impact**: **Medium** — 2 extra role reads per page navigation
- **Affects**: DB reads, latency, duplicate state initialization

### 6. `vocabularyService.ts` — Repeated `supabase.auth.getUser()` in every function
- **What**: Each exported function (`getVocabularyDueForReview`, `getVocabularyStats`, `updateVocabularyProgress`, etc.) calls `supabase.auth.getUser()` independently — 5 calls in the file.
- **Why redundant**: Callers already have the user from context. These are network roundtrips to the auth server.
- **Files**: `src/services/vocabularyService.ts`
- **Impact**: **Low-Medium** — extra auth calls per vocabulary review session
- **Affects**: DB reads (auth), latency

### 7. `exerciseService.ts` — Same pattern as vocabularyService
- **What**: 4 functions each call `supabase.auth.getUser()` independently.
- **Files**: `src/services/exerciseService.ts`
- **Impact**: **Low-Medium**
- **Affects**: DB reads (auth), latency

### 8. `StudentLesson.tsx` — Repeated `teacher_lessons` select with identical columns
- **What**: `loadData` constructs the same `.select(...)` string 3 times (lines 289, 296, 301) for the same query shape.
- **Why redundant**: The column list is duplicated inline. If the share_token lookup returns a result, a second query is made to the same table by ID — this could be avoided since `byToken` already has all the data.
- **Files**: `src/pages/StudentLesson.tsx`
- **Impact**: **Low-Medium** — 1 extra DB read per lesson load when accessed via share token
- **Affects**: DB reads, latency

### 9. `useTranslation.tsx` + `AppHeader.tsx` + `Library.tsx` — Triple `selected_language` fetch
- **What**: `useTranslation` (line 28), `AppHeader` (line 46), and `Library` (line 142) all independently fetch `profiles.selected_language`.
- **Why redundant**: All three are often mounted simultaneously on the Library page.
- **Files**: `src/hooks/useTranslation.tsx`, `src/components/AppHeader.tsx`, `src/pages/Library.tsx`
- **Impact**: **Medium** — 3 reads of the same column on page load
- **Affects**: DB reads, duplicate state initialization

---

## Top 5 Low-Risk DB Efficiency Wins

### Win 1: Reuse resolved video data in `useLessonFlow.ts`
**Files**: `src/hooks/useLessonFlow.ts`
**Fix**: Store the full `resolveVideoData()` result. Use cached `duration` in `trySegmentVideo` instead of re-fetching. Use cached `video_id` in `markAssignment*` instead of re-fetching. Use `user` from context instead of `getUser()`.
**Saves**: ~7 DB/auth calls per lesson session
**Risk**: Very low — pure data reuse

### Win 2: Eliminate double profile fetch on AppHome
**Files**: `src/pages/AppHome.tsx`, `src/components/AppHeader.tsx`
**Fix**: Lift profile data into a shared context or pass AppHome's profile down to AppHeader via props. Alternatively, AppHeader could accept profile as an optional prop and skip its own fetch.
**Saves**: 1 profile read per home page visit
**Risk**: Low — prop threading

### Win 3: Cache role in AuthContext, consume in useRoleGuard/useUserRole
**Files**: `src/hooks/useAuth.tsx`, `src/hooks/useUserRole.tsx`, `src/hooks/useRoleGuard.ts`
**Fix**: Expose `role` from `AuthContext` (it's already fetched on sign-in). Have `useUserRole` and `useRoleGuard` read from context instead of querying.
**Saves**: 2 role reads per teacher page navigation
**Risk**: Low — role is already fetched in useAuth

### Win 4: Accept `userId` param in service functions instead of calling `getUser()`
**Files**: `src/services/vocabularyService.ts`, `src/services/exerciseService.ts`
**Fix**: Add `userId` parameter to each function. Callers pass `user.id` from context. Remove internal `getUser()` calls.
**Saves**: ~9 auth server calls across vocabulary + exercise flows
**Risk**: Low — signature change, callers already have user

### Win 5: Eliminate redundant re-query in StudentLesson `loadData`
**Files**: `src/pages/StudentLesson.tsx`
**Fix**: When `byToken` is found (line 293), use it directly as the lesson data instead of re-querying by ID. It already has all the columns.
**Saves**: 1 teacher_lessons read per share-token lesson load
**Risk**: Very low — data already in hand

---

## Minimal Patch Plan

| Priority | Win | Files | Lines Changed | Risk |
|----------|-----|-------|---------------|------|
| 1 | Reuse video data in useLessonFlow | `useLessonFlow.ts` | ~20 | Very low |
| 2 | StudentLesson byToken reuse | `StudentLesson.tsx` | ~8 | Very low |
| 3 | Cache role in AuthContext | `useAuth.tsx`, `useUserRole.tsx`, `useRoleGuard.ts` | ~25 | Low |
| 4 | Accept userId in services | `vocabularyService.ts`, `exerciseService.ts` | ~30 | Low |
| 5 | Profile prop pass to AppHeader | `AppHome.tsx`, `AppHeader.tsx` | ~15 | Low |

Total: ~100 lines across 8 files. All behavior-preserving.

