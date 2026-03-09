

# 14-Day Free Trial System for Teacher Subscriptions

## Overview

Replace the Free tier with a 14-day trial on Pro limits. After trial expiry, teachers must subscribe to Pro ($19/mo) or Premium ($39/mo) to continue creating lessons. Email verification is required to create lessons.

## Database Changes

**Migration: Add trial fields to `teacher_subscriptions`**

```sql
ALTER TABLE teacher_subscriptions 
ADD COLUMN trial_started_at TIMESTAMPTZ,
ADD COLUMN trial_ends_at TIMESTAMPTZ,
ADD COLUMN trial_used BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_teacher_trial_expiry ON teacher_subscriptions(trial_ends_at) 
WHERE trial_ends_at IS NOT NULL;
```

**Update `enforce_teacher_lesson_limit` function** to recognize `trial` plan with Pro-level limits (60 lessons, 10 min video).

## Code Changes

### 1. New Hook: `src/hooks/useTeacherTrial.ts`
- Fetches `teacher_subscriptions` trial fields + `auth.getUser()` for `email_confirmed_at`
- Returns: `isTrialing`, `daysRemaining`, `emailVerified`, `canCreateLessons`, `trialExpired`
- Used by dashboard, create lesson form, and quota service

### 2. Update `src/services/teacherQuotaService.ts`
- Add `trial` plan to `PLAN_LIMITS` with same limits as `pro` (60 lessons, 10 min)
- Add `isTrialing`, `trialDaysRemaining`, `emailVerified` to `TeacherQuota` interface
- Fetch trial fields from subscription + email_confirmed_at from auth
- Block lesson creation if email not verified OR trial expired

### 3. Update `src/pages/Auth.tsx`
- After teacher signup (line 126-131): insert `teacher_subscriptions` with `plan: 'trial'`, `status: 'trialing'`, `trial_started_at`, `trial_ends_at` (now + 14 days), `trial_used: true`
- Update toast message to mention trial

### 4. Update `src/pages/TeacherDashboard.tsx`
- Add trial banner showing days remaining (blue info card)
- Add email verification warning banner (yellow card) with resend button
- Add trial expired banner (red card) with upgrade CTA
- Use data from `useTeacherQuota` (which now includes trial info)

### 5. Update `src/pages/TeacherPricing.tsx`
- Remove Free tier from `tiers` array
- Change Pro/Premium CTAs to "Start 14-Day Free Trial" for non-subscribers
- Add trial FAQ items (how trial works, email verification, what happens after)
- Update comparison table to remove Free column
- Update hero text

### 6. Update `src/components/teacher/CreateLessonForm.tsx`
- Add email verification gate at top of component (check `email_confirmed_at`)
- Show verification UI with resend button if not verified
- Show trial expired UI with upgrade CTA if trial ended

### 7. Update `enforce_teacher_lesson_limit` DB function
- Add `'trial'` case with limit of 60 (same as pro)

### 8. Analytics Events
- `trial_started` on signup
- `trial_expired_view` when teacher sees expired banner
- `email_verification_resent` on resend click

## Files Modified
- `src/services/teacherQuotaService.ts` -- trial plan limits + trial/email fields
- `src/hooks/useTeacherQuota.ts` -- fetch expanded fields
- `src/pages/Auth.tsx` -- trial initialization on teacher signup
- `src/pages/TeacherDashboard.tsx` -- trial/email banners
- `src/pages/TeacherPricing.tsx` -- remove Free tier, trial CTAs
- `src/components/teacher/CreateLessonForm.tsx` -- verification + trial gates

## Files Created
- Migration SQL for trial columns + index + updated enforce function

