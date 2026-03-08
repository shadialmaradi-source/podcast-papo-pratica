

# Plan: Optimize App Performance

## Overview
Apply three high-impact optimizations: lazy-load route pages (code splitting), add performance tracking, and add missing DB indexes. Skip materialized views (overkill for current scale) and custom domains (infrastructure-level).

## 1. Code Splitting — Lazy Load All Pages

**File: `src/App.tsx`**

Replace all static page imports with `React.lazy()` + wrap routes in `<Suspense>`. This is the single biggest frontend win -- each page and its dependencies only load when navigated to.

```tsx
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const Library = lazy(() => import("./pages/Library"));
// ... all ~20 page imports
```

Add a shared `<Suspense fallback={<LoadingSpinner />}>` wrapping `<Routes>`.

Keep `LandingPage` and `Auth` as eager imports (critical entry paths).

## 2. Debounced Search in Community & Library

**Files: `src/pages/TeacherCommunity.tsx`, `src/pages/Library.tsx`**

- Create a `useDebounce` hook (`src/hooks/useDebounce.ts`) — standard 300ms debounce for search inputs
- Apply to search/filter inputs to avoid re-rendering on every keystroke

## 3. Performance Tracking via PostHog

**File: `src/lib/analytics.ts`**

Add a `trackPageLoad` helper that records `performance.now()` timing. Call from key pages (`AppHome`, `Library`, `TeacherDashboard`) on mount to track load times.

```ts
export const trackPageLoad = (page: string) => {
  postCapture('page_load_time', { page, load_time_ms: Math.round(performance.now()) });
};
```

## 4. Database Indexes (Migration)

Add indexes for the most common query patterns that currently lack them:

```sql
-- teacher_lessons: frequent lookups by teacher_id, student_email, share_token
CREATE INDEX IF NOT EXISTS idx_teacher_lessons_teacher_id ON teacher_lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_lessons_student_email ON teacher_lessons(student_email);
CREATE INDEX IF NOT EXISTS idx_teacher_lessons_share_token ON teacher_lessons(share_token);

-- lesson_exercises: frequent lookups by lesson_id
CREATE INDEX IF NOT EXISTS idx_lesson_exercises_lesson_id ON lesson_exercises(lesson_id);

-- lesson_responses: frequent lookups by lesson_id, user_id
CREATE INDEX IF NOT EXISTS idx_lesson_responses_lesson_id ON lesson_responses(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_responses_user_id ON lesson_responses(user_id);

-- teacher_students: frequent lookups by teacher_id
CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher_id ON teacher_students(teacher_id);

-- youtube_exercises: frequent lookups by video_id
CREATE INDEX IF NOT EXISTS idx_youtube_exercises_video_id ON youtube_exercises(video_id);
```

## 5. QueryClient Stale Time

**File: `src/App.tsx`**

Configure `QueryClient` with sensible defaults to avoid redundant refetches:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  },
});
```

## Files Summary

| Action | File |
|--------|------|
| Create | `src/hooks/useDebounce.ts` |
| Modify | `src/App.tsx` (lazy imports, Suspense, QueryClient config) |
| Modify | `src/lib/analytics.ts` (add trackPageLoad) |
| Modify | `src/pages/AppHome.tsx` (track page load) |
| Modify | `src/pages/Library.tsx` (track page load) |
| Modify | `src/pages/TeacherDashboard.tsx` (track page load) |
| Modify | `src/pages/TeacherCommunity.tsx` (debounced search) |
| Migration | Add indexes on high-traffic columns |

