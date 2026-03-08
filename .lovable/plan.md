

# Plan: Teacher Notifications for Assignment Completion

## Overview

Create a `teacher_notifications` table with a database trigger on `video_assignments` status changes. Build a notification bell component in the teacher header and a full notifications page. Use Supabase Realtime for live updates. Scope limited to in-app notifications only (no email in this iteration — can be added later with Resend).

## Database Changes (1 migration)

**New table: `teacher_notifications`**
- `id` UUID PK
- `teacher_id` UUID NOT NULL (references auth.users)
- `type` TEXT NOT NULL (`assignment_completed`, `assignment_started`, `assignment_overdue`)
- `title` TEXT NOT NULL
- `message` TEXT NOT NULL
- `video_id` TEXT (YouTube string ID, nullable)
- `student_email` TEXT (nullable)
- `read` BOOLEAN DEFAULT FALSE
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- Indexes on `(teacher_id, read, created_at DESC)`

**RLS:**
- Teachers SELECT own rows (`teacher_id = auth.uid()`)
- Teachers UPDATE own rows (for mark-as-read)
- INSERT via SECURITY DEFINER trigger function (no open insert policy needed)

**Trigger function: `notify_teacher_assignment_completed()`**
- SECURITY DEFINER, fires AFTER UPDATE on `video_assignments`
- When `NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed')`:
  - Looks up student name from `teacher_students`
  - Uses `NEW.video_title` (already on the row)
  - Inserts into `teacher_notifications`

**Enable Realtime** on `teacher_notifications` via `alter publication supabase_realtime add table teacher_notifications`.

**Add `notification_preferences` JSONB column to `teacher_profiles`** (default: all enabled, realtime frequency).

## Frontend Components

### 1. `TeacherNotificationBell.tsx` (new)
- Renders bell icon with red unread count badge
- On mount: fetches unread count from `teacher_notifications`
- Subscribes to Supabase Realtime INSERT events filtered by `teacher_id`
- On new notification: increment count, show sonner toast with message
- Click → opens Popover/DropdownMenu with latest 5 notifications
- Each item: icon by type, message, relative time, read/unread styling
- "Mark all read" button
- "View all" link → `/teacher/notifications`

### 2. `TeacherNotifications.tsx` (new page)
- Full list with filter tabs: All / Unread / Completed
- Each row: type icon, message, relative time, read/unread dot
- Click row → mark as read + navigate to `/teacher/students` (or student detail if available)
- "Mark All Read" button
- Empty state when no notifications
- Pagination (20 per page)

### 3. Update `TeacherDashboard.tsx`
- Add `TeacherNotificationBell` to the header bar (next to Settings icon)

### 4. Update `TeacherNav.tsx`
- Add a 4th nav item: Bell icon with badge for notifications at `/teacher/notifications`

### 5. Update `TeacherSettings.tsx`
- Add "Notifications" item to settings list → `/teacher/notifications/settings` (future, for now just the nav item linking to the notifications page)

### 6. Update `App.tsx`
- Add `/teacher/notifications` route

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | New table, trigger function, RLS, realtime |
| `src/components/teacher/TeacherNotificationBell.tsx` | New — bell + dropdown |
| `src/pages/TeacherNotifications.tsx` | New — full notifications page |
| `src/pages/TeacherDashboard.tsx` | Add bell to header |
| `src/components/teacher/TeacherNav.tsx` | Add notifications nav item |
| `src/App.tsx` | Add route |

## What's Deferred

- Email notifications (requires Resend integration — separate feature)
- Daily digest cron job
- Notification preferences settings page
- Assignment overdue trigger (requires cron, separate feature)
- Push notifications

