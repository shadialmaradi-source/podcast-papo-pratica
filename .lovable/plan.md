

# Enhance Teacher Dashboard Trial Banners

## Summary

The dashboard already has trial, expired, email verification, and payment banners. This update enhances them with: corrected lesson limit text, lessons-created count, an urgent orange warning for the last 3 days, and analytics tracking.

## Changes (single file: `src/pages/TeacherDashboard.tsx`)

### 1. Fix trial banner text (line 168)
- Change "Create up to 60 lessons" → "Create up to 30 lessons" (matches updated PLAN_LIMITS)
- Add lessons-created count: "You've created X lessons so far"

### 2. Add urgency banner for last 3 days
- Between the trial-active banner and the email verification warning
- Orange/amber styling when `trialDaysRemaining <= 3 && trialDaysRemaining > 0`
- "Trial ending soon" message with prominent "Upgrade Now" CTA
- Shows alongside the regular trial banner (which stays blue)

### 3. Add analytics tracking
- Track `trial_banner_viewed` on mount when trial is active (in the existing useEffect)
- Track `trial_upgrade_clicked` on "View Plans" / "Upgrade Now" clicks with `days_remaining`

### 4. Reorder banners
- Email verification (yellow) — first, most critical
- Trial active (blue) — informational
- Trial urgency (orange) — last 3 days warning
- Trial expired (red)
- Payment failure (red)

No new files, no DB changes. Single file edit.

