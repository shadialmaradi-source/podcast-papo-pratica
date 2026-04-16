

# Limit "My Lessons" to 2 on Profile Page

## Problem
The profile page shows ALL assigned lessons in the "My Lessons" section, forcing students to scroll extensively. The screenshot shows 9+ lessons listed inline.

## Solution
In `src/components/ProfilePage.tsx`, limit the displayed lessons to the latest 2 (already sorted by `created_at` descending) and add a "View all lessons" button that navigates to `/my-lessons`.

### File: `src/components/ProfilePage.tsx`

**Lines 799-823** — Replace the `CardContent` block:
- Show only `myLessons.slice(0, 2)` instead of the full array
- Add a "View all X lessons" button below the 2 cards when `myLessons.length > 2`
- Button navigates to `/my-lessons` (the existing `MyLessons` page)

No other files need changes — the `/my-lessons` page already exists and shows the full list.

