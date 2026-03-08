

# Plan: Enhanced "Assigned by Teacher" Section on Student Homepage

## Current State

- Video assignments already display on `/app` as simple list items with Watch/Done buttons
- The `video_assignments` table stores `video_id` (YouTube ID string, NOT the UUID), `video_title`, `due_date`, `note`, `status`
- Navigation to `/lesson/${a.video_id}` is broken because the Lesson page expects a `youtube_videos.id` UUID, not a YouTube video ID string
- No `/my-assignments` page exists
- No teacher name shown on assignments
- No overdue/due-soon styling
- No thumbnail display

## Key Issue: video_id Mismatch

The `AssignVideoModal` stores the YouTube video ID (e.g. `dQw4w9WgXcQ`) but the lesson route needs the `youtube_videos.id` UUID. We need to look up the UUID when navigating.

## Plan

### 1. Create `AssignedVideosSection.tsx` component

New component replacing the current inline video assignments block in AppHome. Features:
- Fetch assignments with a join-like approach: after fetching assignments, look up `youtube_videos` by `video_id` field to get UUID, thumbnail, level, duration
- Sort: overdue first, then by due date ascending, then no due date
- Show max 3 cards (2 on mobile)
- "See All" link to `/my-assignments` if more than 3
- Hide section entirely if no assignments

Each card shows:
- Thumbnail (from `youtube_videos.thumbnail_url`, derived from YouTube ID)
- Title, level badge, duration
- Due date badge with color coding (overdue=red, today=orange, soon=yellow, normal=gray)
- Teacher note (truncated)
- CTA button: Start / Continue / Review based on status
- Red border for overdue items

### 2. Create `AssignmentVideoCard.tsx` component

Reusable card for both homepage and assignments page. Props: assignment data + video metadata. Handles:
- Due date logic and badge colors
- Status-based CTA text
- Click → navigate to `/lesson/{youtube_videos_uuid}` (look up UUID from YouTube video ID)
- Track analytics on click

### 3. Create `/my-assignments` page (`MyAssignments.tsx`)

Full page showing all video assignments with:
- Filter tabs: All / Overdue / Upcoming / Completed
- Each assignment as a card (reuses `AssignmentVideoCard`)
- Sorting by due date

### 4. Update `AppHome.tsx`

- Replace the current inline video assignments block (lines 461-505) with `<AssignedVideosSection />`
- Move section ABOVE the "What do you want to learn today?" heading
- Remove the `markAssignmentComplete` function and related state (handled by the new component)

### 5. Update assignment status on lesson interaction

- In `Lesson.tsx`: check URL param `?assignment=true`, update `video_assignments` status to `in_progress` on load and `completed` on lesson completion
- Look up assignment by matching `video_id` (YouTube ID) from the `youtube_videos` table

### 6. Add route for `/my-assignments`

In `App.tsx`, add protected route for the new page.

### 7. Analytics

Track: `assignment_viewed`, `assignment_started`, `assignment_completed`, `my_assignments_page_viewed`

## Files Changed

| File | Change |
|------|--------|
| `src/components/AssignedVideosSection.tsx` | New — fetches & displays top 3 assignments |
| `src/components/AssignmentVideoCard.tsx` | New — individual assignment card |
| `src/pages/MyAssignments.tsx` | New — full assignments list page |
| `src/pages/AppHome.tsx` | Replace inline video assignments with new component, reposition above hero |
| `src/pages/Lesson.tsx` | Handle `?assignment=true` param for status updates |
| `src/App.tsx` | Add `/my-assignments` route |

## No Database Changes Needed

The existing `video_assignments` table and RLS policies are sufficient. The `youtube_videos` table already has the thumbnail/level/duration data we need.

