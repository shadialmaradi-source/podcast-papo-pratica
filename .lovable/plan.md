
# Plan: Fix Streak and XP Data Accuracy

## Problem Analysis

Based on database investigation for user `shadi.almaradi@gmail.com`:

| Data Point | `profiles` table (displayed) | `user_streak_data` table (correct) |
|------------|------------------------------|-----------------------------------|
| Current Streak | 1 | 2 |
| Longest Streak | 1 | 17 |
| Total XP | 2080 | ~250 (actual sum from sources) |

**Root causes:**
1. **Streak**: `AppHome.tsx` reads `current_streak` from `profiles` table, but streak updates only happen to `user_streak_data` table (never synced back to profiles).
2. **XP**: The `profiles.total_xp` has inflated over time, possibly from duplicate XP additions. The actual XP from `user_exercise_results` + `user_video_progress` + `daily_activities` totals ~250, not 2080.

## Fix Strategy

### 1. Code Fix: Read streak from correct table
Modify `AppHome.tsx` to fetch streak data from `user_streak_data` instead of `profiles.current_streak`.

### 2. Data Fix: Recalculate XP for all users
Run a SQL update to set `profiles.total_xp` to the actual sum of:
- `user_exercise_results.xp_earned`
- `user_video_progress.xp_earned`

### 3. Data Fix: Sync streak from user_streak_data to profiles
Copy correct streak values from `user_streak_data` to `profiles` for all users.

## Implementation

### Files to modify:
- `src/pages/AppHome.tsx` -- fetch from `user_streak_data` table for streak display

### Database migration:
- Update `profiles.current_streak` and `profiles.longest_streak` from `user_streak_data`
- Recalculate `profiles.total_xp` from actual XP sources

This ensures accurate display going forward and corrects existing user data.
