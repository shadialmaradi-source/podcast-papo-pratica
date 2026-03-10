

# Update Teacher Pricing Page

## Summary

Update tiers, comparison table, FAQ, and add a value comparison section. The page already has no Free tier and shows 14-day trials -- this update changes lesson limits (60→30 Pro, 160→100 Premium), updates features/descriptions, expands FAQ, and adds an ROI section.

## Changes (single file: `src/pages/TeacherPricing.tsx`)

### 1. Update `tiers` array (lines 26-57)
- Pro: 30 lessons/month, "Perfect for active tutors", mark as `recommended: false`, add "MOST POPULAR" to Premium instead
- Premium: 100 lessons/month, "For professional tutors", `recommended: true` with badge text "MOST POPULAR"
- Update feature lists per user spec (student tracking, all lesson types, analytics split)

### 2. Update `comparisonRows` (lines 59-66)
- Lessons: 30 / 100
- Add rows: Student progress tracking, Basic/Advanced analytics, Email notifications, Support tier

### 3. Replace `faqItems` (lines 68-93)
- 7 items covering trial, credit card, lesson definition, post-trial, plan switching, limit hitting, student pricing

### 4. Add Value Comparison section
- Insert between comparison table and FAQ separator
- "Why ListenFlow Saves You Money" card with manual vs ListenFlow cost breakdown
- Green highlight: "Save $95/week = $380/month"

### 5. Swap recommended flag
- Pro loses `recommended: true`, Premium gains it with "MOST POPULAR" badge

