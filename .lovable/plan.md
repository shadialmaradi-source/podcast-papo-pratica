

# Plan: Add Retention Analytics to Teacher Analytics Dashboard

## Overview
Extend the existing `/teacher/analytics` page with 5 new sections: retention metrics, churn prediction, engagement metrics, content performance, and cohort analysis. All computed client-side from existing tables -- no database changes needed.

## File to Modify

### `src/pages/TeacherAnalytics.tsx`

**1. Retention Metrics Section**
- Compute retention at week 1/2/4 and month 1 by checking which students have `lesson_responses` within those windows relative to their first assignment date (`teacher_lessons.created_at`)
- Retention curve chart (LineChart): X = weeks since first assignment, Y = % still active

**2. Churn Prediction Section (replaces simple at-risk list)**
- Calculate risk score (0-100) per student: `daysInactive * 5` (capped at 50) + `(100 - completionRate) * 0.5` (capped at 50)
- Color-coded: Red (80-100), Yellow (50-79), Green (0-49)
- Table: Student, Risk score with emoji, Last Active, Completion %, Action buttons (View Detail)

**3. Engagement Metrics Section**
- Avg lessons/week per student: total completed / weeks since first student joined / student count
- Most active day: group `lesson_responses.submitted_at` by day of week
- Engagement over time chart: responses per day grouped by week

**4. Content Performance Section**
- Group `teacher_lessons` by title, count assigned vs completed
- Table: Lesson Title, Assigned count, Completed count, Completion Rate, sorted by completion rate desc

**5. Cohort Analysis Section**
- Group students by month they were added (`teacher_students.invited_at`)
- Also group by level
- Show retention comparison across cohorts as a simple table

**Data**: All derived from existing `teacher_students`, `teacher_lessons`, and `lesson_responses` queries already fetched. Will expand the fetch to also grab `invited_at` from students and `title` from lessons.

**Analytics**: Track `retention_viewed` on mount alongside existing `analytics_viewed`.

No new files, no database changes.

