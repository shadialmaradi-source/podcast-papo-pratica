

# Structured Learning Path for Video Library

## Summary

Add a structured, week-based learning path to the existing Video Library's "Curated" tab. Users will progress through themed weeks (e.g., "Greetings & Introductions", "Daily Routine") with sequential video unlocking and XP rewards. The "Community" tab and all existing functionality remain untouched.

This is a large feature. To stay within 5-7 credits per day, it is broken into **5 implementation phases** (one per day/credit batch).

---

## Architecture Overview

The learning path introduces 4 new database tables, 2 new pages, 3 new components, and modifications to 4 existing files. It integrates with the existing XP/streak system and reuses the current Lesson page for video playback.

```text
Homepage (/app)
  |
  "Learn from Library" --> Library (/library)
                              |
                    +---------+---------+
                    |                   |
              Curated Tab          Community Tab
           (NEW: Learning Path)    (unchanged)
                    |
              Week Cards
           (with progress bars)
                    |
              /learn/week/:id
           (Week Detail Page)
                    |
            Video Cards (sequential)
                    |
            /learn/video/:weekVideoId
           (Video Player Page)
                    |
            "Mark Complete" --> XP + unlock next
```

---

## Phase 1: Database Schema + Seed Data (Day 1)

### New Tables

**learning_weeks** - Defines each themed week
- `id` (uuid, PK)
- `level` (text) - "beginner", "intermediate", "advanced"
- `week_number` (integer)
- `title` (text)
- `description` (text)
- `cefr_level` (text) - "A1", "A2", "B1", "B2"
- `language` (text, default "english") - supports multi-language
- `order_index` (integer)
- `total_videos` (integer)
- `is_locked_by_default` (boolean)
- `created_at` (timestamp)

**week_videos** - Videos within each week
- `id` (uuid, PK)
- `week_id` (uuid, FK -> learning_weeks)
- `title` (text)
- `youtube_url` (text)
- `youtube_id` (text)
- `duration_seconds` (integer)
- `thumbnail_url` (text)
- `source` (text)
- `order_in_week` (integer)
- `grammar_focus` (text)
- `vocabulary_tags` (text[])
- `xp_reward` (integer)
- `created_at` (timestamp)

**user_week_progress** - Per-user week unlock/completion state
- `id` (uuid, PK)
- `user_id` (uuid, FK -> auth.users)
- `week_id` (uuid, FK -> learning_weeks)
- `videos_completed` (integer, default 0)
- `is_unlocked` (boolean, default false)
- `is_completed` (boolean, default false)
- `unlocked_at` (timestamp, nullable)
- `completed_at` (timestamp, nullable)
- `created_at` (timestamp)
- UNIQUE constraint on (user_id, week_id)

**user_video_progress** - Per-user video completion tracking
- `id` (uuid, PK)
- `user_id` (uuid, FK -> auth.users)
- `week_video_id` (uuid, FK -> week_videos)
- `status` (text, default "not_started")
- `completed_at` (timestamp, nullable)
- `xp_earned` (integer, default 0)
- `created_at` (timestamp)
- UNIQUE constraint on (user_id, week_video_id)

### RLS Policies

All 4 tables will have RLS enabled:
- `learning_weeks`: SELECT for everyone (public content)
- `week_videos`: SELECT for everyone (public content)
- `user_week_progress`: SELECT/INSERT/UPDATE restricted to own user_id
- `user_video_progress`: SELECT/INSERT/UPDATE restricted to own user_id

### Seed Data

8 weeks for Beginner level (English language), each with 5-6 videos:
1. Week 1: Greetings & Introductions (5 videos, A1)
2. Week 2: Daily Routine (5 videos, A1)
3. Week 3: Food & Eating (6 videos, A1)
4. Week 4: Family & Friends (5 videos, A1-A2)
5. Week 5: Shopping & Money (6 videos, A2)
6. Week 6: Time & Dates (5 videos, A2)
7. Week 7: Describing Things (6 videos, A2)
8. Week 8: Past Experiences (6 videos, A2)

Videos will use real YouTube IDs from channels like VOA Learning English, English with Lucy, BBC Learning English, etc. Week 1 is unlocked by default (`is_locked_by_default = false`).

### TypeScript Types Update

Update `src/integrations/supabase/types.ts` to include the 4 new tables.

---

## Phase 2: Learning Path UI in Library (Day 2)

### Modify: `src/pages/Library.tsx`
- When `activeTab === 'curated'`:
  - Hide the existing FilterBar (filters only apply to Community tab)
  - Instead of showing video cards, render the new `LearningPath` component
  - Fetch `learning_weeks` for the selected level and user's language
  - Fetch `user_week_progress` for the current user
- When `activeTab === 'community'`:
  - Keep everything exactly as-is (existing video grid with filters)

### New Component: `src/components/library/LearningPath.tsx`
Displays the week cards for a given level:
- Header showing level name and overall progress (e.g., "Beginner Path (A1-A2) -- 15% complete")
- Overall progress bar
- List of `WeekCard` components

### New Component: `src/components/library/WeekCard.tsx`
Each week card shows:
- Week number and title
- Completion status icon (checkmark for complete, play for in-progress, lock for locked)
- Progress: "3/5 videos complete -- 30 XP"
- Mini progress bar
- Action button: "View" (completed), "Continue" (in progress), or "Complete Week N to unlock" (locked)
- Click navigates to `/learn/week/:weekId`
- Locked weeks are visually dimmed with no click action

---

## Phase 3: Week Detail Page (Day 3)

### New Route: `/learn/week/:weekId`
Added to `src/App.tsx` as a protected route.

### New Page: `src/pages/WeekDetail.tsx`
- Header with back navigation to `/library`
- Week title and description
- Progress bar showing videos completed
- XP earned in this week
- List of video cards in order

Each video card shows:
- Order number (1, 2, 3...)
- Video title
- Source and duration
- Grammar focus tag
- Status: completed (checkmark + "Watch Again"), current (play button + "Start Video"), or locked ("Complete previous video")
- Videos unlock sequentially: video N+1 unlocks when video N is completed
- Exception: video 1 is always unlocked if the week is unlocked
- Click navigates to `/learn/video/:weekVideoId`

---

## Phase 4: Video Player Page + Completion Logic (Day 4)

### New Route: `/learn/video/:weekVideoId`
Added to `src/App.tsx` as a protected route.

### New Page: `src/pages/WeekVideo.tsx`
- Header with breadcrumb: "Back to Week N"
- Video title and "Video X of Y in Week N"
- Grammar focus badge
- Embedded YouTube player (iframe using youtube_id)
- Key Vocabulary section showing vocabulary_tags as chips
- "Save to Flashcards" button (creates user_created_flashcards entries)
- "Mark as Complete" button (prominent, full-width)

### Completion Logic (when "Mark as Complete" is clicked):
1. Insert/update `user_video_progress` with status = "completed", xp_earned = video's xp_reward
2. Update `user_week_progress.videos_completed` (increment by 1)
3. Add XP to `profiles.total_xp`
4. Update streak data in `user_streak_data`
5. Log activity in `daily_activities` and `user_activity_history`
6. Check if week is now complete (80% threshold = 4/5 or 5/6 videos):
   - If yes: mark week as completed, unlock next week's `user_week_progress`
7. Show success toast with XP earned
8. If week completed: show a celebration message and auto-navigate back to week detail

### Service: `src/services/learningPathService.ts`
Centralized functions for:
- `fetchWeeksForLevel(level, language)` - get weeks with user progress
- `fetchWeekVideos(weekId, userId)` - get videos with user progress
- `completeVideo(userId, weekVideoId)` - handles all completion logic
- `initializeUserProgress(userId, weekId)` - creates initial progress records

---

## Phase 5: Profile Integration + Polish (Day 5)

### Modify: `src/components/ProfilePage.tsx`
Add a "Learning Path" card between the "Continue Learning" button and "Level Progress" card:
- Shows current week the user is on (first incomplete week)
- "Continue Learning Path" button -> navigates to current week
- Stats: "Week 3 of 8 -- Beginner" and "23/44 videos completed"

### Modify: `src/pages/AppHome.tsx`
- Update the "Curated videos by level" subtitle to "Structured learning path"
- No other changes to homepage

### Polish
- Animations: Use framer-motion for week cards (staggered entrance)
- Mobile: Stack week cards vertically, full-width video player
- Loading states: Skeleton loaders for week cards and video lists
- Empty states: "Coming soon!" message for Intermediate and Advanced paths

---

## Files Summary

| Phase | File | Action |
|-------|------|--------|
| 1 | `supabase/migrations/[timestamp]_learning_path.sql` | Create (4 tables + RLS + seed data) |
| 1 | `src/integrations/supabase/types.ts` | Modify (add 4 table types) |
| 2 | `src/pages/Library.tsx` | Modify (conditional rendering for curated tab) |
| 2 | `src/components/library/LearningPath.tsx` | Create |
| 2 | `src/components/library/WeekCard.tsx` | Create |
| 3 | `src/App.tsx` | Modify (add 2 new routes) |
| 3 | `src/pages/WeekDetail.tsx` | Create |
| 4 | `src/pages/WeekVideo.tsx` | Create |
| 4 | `src/services/learningPathService.ts` | Create |
| 5 | `src/components/ProfilePage.tsx` | Modify (add learning path card) |
| 5 | `src/pages/AppHome.tsx` | Modify (minor text update) |

### Progression Rules
- Week 1 is always unlocked for new users (auto-initialized on first library visit)
- Week N+1 unlocks when 80% of Week N videos are completed (4/5 or 5/6)
- Videos within a week unlock sequentially (must complete video 1 before video 2)
- XP values: Beginner = 10, Intermediate = 15, Advanced = 20 per video
- XP integrates with existing `profiles.total_xp` and streak system

