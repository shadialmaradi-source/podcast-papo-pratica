

# Plan: Teacher Analytics Dashboard at `/teacher/analytics`

## Overview
Create a progress tracking dashboard where teachers can view student activity overview, at-risk students, and completion trends via charts. Integrates with existing `teacher_students` and `teacher_lessons` tables.

## No Database Changes
All data can be computed from existing `teacher_students`, `teacher_lessons`, and `lesson_responses` tables.

## Files to Create

### 1. `src/pages/TeacherAnalytics.tsx`
Main analytics page with these sections:

**Overview Cards (top row)**: Total Students, Active This Week, Lessons Assigned, Avg Completion Rate -- computed from `teacher_students` + `teacher_lessons` data.

**Student Activity Table**: Columns: Student, Assigned, Completed, In Progress, Not Started, Last Active, Trend. Trend computed by comparing recent completion rate vs older rate. Filterable by time range (7d/30d/all), specific student, status (All/Active/At Risk/Inactive).

**At-Risk Students Section**: Card listing students with: no activity in 7+ days, completion rate below 50%, or overdue lessons. Each row has student name, issue description, and action button (navigates to student detail).

**Charts** (using Recharts, already installed):
1. Completion Rate Over Time -- Line chart from `lesson_responses.submitted_at` grouped by date
2. Lessons by Level -- Bar chart showing distribution of assigned lessons across CEFR levels

**Data fetching**: Query `teacher_students`, `teacher_lessons` (with status), and `lesson_responses` (for timestamps). Compute all stats client-side.

**Analytics**: Track `analytics_viewed` on mount.

### Design
- Same header pattern as TeacherStudents (back arrow to `/teacher`, title)
- Uses existing Card, Table, Badge, Select, and Recharts chart components
- Student names clickable to navigate to `/teacher/student/:id`

## Files to Modify

### 2. `src/App.tsx`
- Import `TeacherAnalytics`
- Add protected route: `/teacher/analytics`

### 3. `src/pages/TeacherDashboard.tsx`
- Add a third card in the hero grid: "Analytics" card with BarChart3 icon, clicking navigates to `/teacher/analytics`

