

# Plan: Pricing Adjustments — Lesson Limits, Updated Tiers, and Documentation

## Overview

Update the teacher pricing page and backend to reflect cost-based lesson limits per tier, add lesson usage tracking, and enforce limits during lesson creation. Also create a pricing analysis document.

## What Exists
- `teacher_subscriptions` table with `plan` field (`free`, `pro`, `premium`)
- `teacher-stripe-checkout` edge function with $19/pro, $39/premium pricing
- `TeacherPricing.tsx` with 3 tier cards and comparison table
- `teacher_lessons` table tracks all lessons per teacher
- No lesson count limits are currently enforced

## Changes

### 1. Database Migration
- Add `teacher_lesson_usage` view or just query `teacher_lessons` by `teacher_id` + current month
- No new table needed — count lessons from `teacher_lessons` using `created_at >= start_of_month`

### 2. Create `/docs/pricing-analysis.md`
Static documentation with cost breakdowns, break-even analysis, and margin calculations as specified.

### 3. Update `TeacherPricing.tsx`
Update tier cards and comparison table to reflect lesson limits:

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| Students | 3 | Unlimited | Unlimited |
| Lessons/month | 10 | 60 | 160 |
| Max video length | 5 min | 10 min | 15 min |
| Lesson types | All | All | All |
| Analytics | Basic | Advanced | Advanced |
| Branding | ListenFlow | Removable | Your Brand |

### 4. Create `src/services/teacherQuotaService.ts`
New service that:
- Fetches current month's lesson count from `teacher_lessons`
- Fetches teacher's subscription plan from `teacher_subscriptions`
- Returns `{ lessonsUsed, lessonsLimit, maxVideoMinutes, canCreateLesson }`
- Limits: Free=10, Pro=60, Premium=160

### 5. Create `src/hooks/useTeacherQuota.ts`
Hook wrapping the quota service, returns quota state + `refresh()`.

### 6. Update `TeacherDashboard.tsx`
- Show quota indicator (e.g., "3/10 lessons this month") on home screen
- Before entering lesson creation flow, check quota — if at limit, show upgrade prompt

### 7. Update `CreateLessonForm.tsx` (YouTube lessons)
- Check video duration against tier limit (5/10/15 min)
- If too long, show error with upgrade CTA

### 8. Update `SpeakingLessonCreator.tsx`
- Check quota before allowing creation

### 9. Update FAQ in `TeacherPricing.tsx`
Add question about lesson limits.

## Files Changed

| File | Change |
|------|--------|
| `docs/pricing-analysis.md` | New — cost analysis document |
| `src/services/teacherQuotaService.ts` | New — quota checking logic |
| `src/hooks/useTeacherQuota.ts` | New — React hook for quota |
| `src/pages/TeacherPricing.tsx` | Update tiers, comparison table, FAQ |
| `src/pages/TeacherDashboard.tsx` | Add quota indicator + gate |
| `src/components/teacher/CreateLessonForm.tsx` | Add video duration limit check |
| `src/components/teacher/SpeakingLessonCreator.tsx` | Add quota check before create |

No database migration needed — lesson counts derived from existing `teacher_lessons` table. No edge function changes needed — limits enforced client-side with server-side backup via RLS if desired later.

