

# Plan: Stripe Integration — Enforce Tier Limits

## What Already Exists
- `teacher-stripe-checkout` creates checkout sessions with plan metadata — working
- `stripe-webhook` handles checkout completion, subscription deleted/updated, payment failed — partially working
- `TeacherPricing.tsx` has full pricing UI with checkout and portal links — working
- `teacher_subscriptions` table stores plan/status/stripe IDs — working
- `enforce_teacher_lesson_limit` DB trigger enforces lesson count per plan — working
- Video duration check in edge functions — working

## What's Missing / Broken

### 1. stripe-portal doesn't work for teachers
The portal function only checks `subscriptions` table (student), not `teacher_subscriptions`. Teachers clicking "Manage Subscription" get an error.

### 2. Webhook doesn't update plan on subscription changes
`customer.subscription.updated` only updates `status`, not `plan`. If a teacher upgrades Pro→Premium via Stripe portal, the plan never changes in our DB.

### 3. Payment failure doesn't block lesson creation
`invoice.payment_failed` only logs — doesn't set status to `past_due`. Teachers with failed payments can keep creating lessons.

### 4. No `current_period_end` stored
Can't show "Next billing: April 1" without this column.

### 5. No usage summary on pricing page
Current subscribers see "Current Plan" button but no usage stats or billing date.

## Changes

### Migration: Add `current_period_end` to `teacher_subscriptions`
```sql
ALTER TABLE teacher_subscriptions ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
```

### `supabase/functions/stripe-portal/index.ts`
Add teacher support: after checking `subscriptions`, also check `teacher_subscriptions` for `stripe_customer_id`. Use whichever has a valid customer ID.

### `supabase/functions/stripe-webhook/index.ts`
- **`customer.subscription.updated`**: Also update `plan` from metadata and store `current_period_end`
- **`invoice.payment_failed`**: Set `status = 'past_due'` on `teacher_subscriptions` (or `subscriptions`)
- **`checkout.session.completed`**: Store `current_period_end` from the subscription object

### `src/services/teacherQuotaService.ts`
Update to also check `status` — block lesson creation when status is `past_due`.

### `src/pages/TeacherPricing.tsx`
For current subscribers, show usage stats (lessons used/limit) and next billing date. Fetch from `useTeacherQuota` hook + subscription data.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/stripe-portal/index.ts` | Check `teacher_subscriptions` for stripe_customer_id |
| `supabase/functions/stripe-webhook/index.ts` | Update plan + current_period_end on sub updates; set past_due on payment failure |
| `src/services/teacherQuotaService.ts` | Block when status is past_due |
| `src/pages/TeacherPricing.tsx` | Show usage stats and billing date for subscribers |
| Migration | Add `current_period_end` column |

