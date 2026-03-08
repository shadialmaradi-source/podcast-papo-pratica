

# Plan: Simplify Teacher Dashboard + Add Teacher Settings Page

## What Changes

1. **Clean up Teacher Dashboard** -- Remove Analytics, Pricing, Community, Branding cards and the LessonList from the homepage. Keep only "Create a Lesson" and "My Students" as the two hero cards.

2. **Create Teacher Settings page** (`/teacher/settings`) -- Similar to the student Profile page, with sections for:
   - **Pricing** -- Link to `/teacher/pricing`
   - **Community** -- Link to `/teacher/community`
   - **Branding** -- Link to `/teacher/branding`
   - **Analytics** -- Link to `/teacher/analytics`
   - **Sign Out** button
   - Teacher name/email display at top

3. **Add Settings icon to Dashboard header** -- Replace the "Sign Out" button in the header with a Settings gear icon that navigates to `/teacher/settings`.

4. **Move lesson list into Student Detail page** -- The `TeacherStudentDetail` page already shows assigned lessons per student. The LessonList component on the dashboard is removed since lessons are now accessed through the student they're assigned to.

## Files to Create

### `src/pages/TeacherSettings.tsx`
Settings page with teacher profile info at top, then navigation cards for Analytics, Pricing, Community, Branding (each navigates to its existing page). Sign Out button at bottom. Gear icon in header links back to dashboard.

## Files to Modify

### `src/pages/TeacherDashboard.tsx`
- Remove the 4 cards: Analytics, Pricing, Community, Branding
- Remove the `<Separator>` and `<LessonList>` section
- Replace "Sign Out" header button with a Settings gear icon navigating to `/teacher/settings`
- Remove unused imports (BarChart3, CreditCard, Globe, Palette, Separator, LessonList)

### `src/App.tsx`
- Add lazy import and route for `/teacher/settings` -> `TeacherSettings`

