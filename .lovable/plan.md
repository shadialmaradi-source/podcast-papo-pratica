

# Plan: Improve Teacher Dashboard Loading Performance

## Overview
Add pagination, loading skeletons, lazy-loaded analytics tabs, and database indexes to handle 50+ students and 200+ lessons efficiently.

## Database Changes

### New indexes (migration)
```sql
CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher_status ON teacher_students(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_lessons_teacher ON teacher_lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_responses_lesson ON lesson_responses(lesson_id);
```

## Files to Modify

### 1. `src/pages/TeacherStudents.tsx` — Add pagination + skeletons
- Add `page` state (1-based), `PAGE_SIZE = 20`
- Use Supabase `.range()` to fetch only current page of students
- Add pagination controls (Previous/Next) at bottom using existing Pagination components
- Replace "Loading..." text with Skeleton rows (6 skeleton table rows)
- Keep filters working with pagination reset on filter change

### 2. `src/components/teacher/LessonList.tsx` — Add pagination + skeletons
- Add `page` state, `PAGE_SIZE = 20`
- Use `.range()` on the teacher_lessons query
- Add Previous/Next buttons below the list
- Already has skeleton loading — keep it

### 3. `src/pages/TeacherAnalytics.tsx` — Lazy-load sections with tabs
- Wrap the page content in a `Tabs` component with 3 tabs: "Overview", "Retention & Churn", "Engagement & Content"
- **Overview tab**: Overview cards + Student Activity table + Charts (loaded on mount)
- **Retention & Churn tab**: RetentionMetrics + ChurnPrediction + CohortAnalysis (data computed only when tab selected)
- **Engagement & Content tab**: EngagementMetrics + ContentPerformance (data computed only when tab selected)
- Use `useState` to track active tab; only compute expensive `useMemo` when tab is active
- Add proper Skeleton placeholders for each section while loading
- Paginate the student activity table (20 per page) with local pagination since data is already fetched

### 4. `src/pages/TeacherDashboard.tsx` — Add skeleton loading
- Replace the simple "Loading..." state with skeleton cards matching the hero grid layout (4 skeleton cards)

## Technical Approach
- **Pagination**: Server-side via Supabase `.range(from, to)` for students and lessons lists
- **Lazy loading**: Tab-based deferred rendering for analytics sections — heavy chart/table sections only render when their tab is active
- **Skeletons**: Use existing `Skeleton` component for all loading states
- **Caching**: React Query not needed here since data changes frequently; the tab-based lazy loading provides sufficient optimization
- **Indexes**: Compound indexes on the most queried columns to speed up server-side queries

