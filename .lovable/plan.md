

# Plan: Teacher Pricing Page and Stripe Integration

## Overview
Create a `/teacher/pricing` page with 3 tiers (Free/Pro/Premium), a dedicated teacher checkout edge function, a `teacher_subscriptions` table, webhook handling for teacher plans, and free-tier student limit enforcement.

## Database Changes

### New table: `teacher_subscriptions`
```sql
CREATE TABLE public.teacher_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'premium'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'past_due'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.teacher_subscriptions ENABLE ROW LEVEL SECURITY;
-- Teachers can read own subscription
CREATE POLICY "Teachers can select own subscription" ON public.teacher_subscriptions FOR SELECT USING (auth.uid() = teacher_id);
-- Service role manages writes (webhook)
CREATE POLICY "Service role can manage teacher subscriptions" ON public.teacher_subscriptions FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');
-- Teachers can insert own (for initial free record)
CREATE POLICY "Teachers can insert own subscription" ON public.teacher_subscriptions FOR INSERT WITH CHECK (auth.uid() = teacher_id);
```

## Files to Create

### 1. `src/pages/TeacherPricing.tsx`
3-tier pricing page:
- **Hero**: "Choose Your Plan" headline
- **3 Cards**: Free ($0, 3 students, basic features), Pro ($19/mo, unlimited students, advanced features, "RECOMMENDED" badge), Premium ($39/mo, white-label, API, dedicated support)
- **Comparison Table**: Feature matrix (students, learning paths, analytics, branding, support)
- **FAQ Accordion**: Cancel policy, downgrade behavior, student pricing
- **Checkout flow**: Pro/Premium buttons call `teacher-stripe-checkout` edge function, Premium also has "Contact Sales" option
- **Manage Subscription**: If already on Pro/Premium, show "Manage Subscription" button linking to Stripe Portal
- Uses existing `trackEvent` for analytics

### 2. `supabase/functions/teacher-stripe-checkout/index.ts`
Separate edge function for teacher checkout (different products/prices than student Premium):
- Accepts `{ plan: 'pro' | 'premium', successUrl, cancelUrl }`
- Creates Stripe checkout session with inline `price_data`: $19/mo for Pro, $39/mo for Premium
- Includes `supabase_user_id` and `teacher_plan` in metadata
- Reuses existing Stripe customer lookup pattern from `stripe-checkout`

## Files to Modify

### 3. `supabase/functions/stripe-webhook/index.ts`
Add handling for teacher subscriptions:
- In `checkout.session.completed`: check `metadata.teacher_plan` -- if present, upsert into `teacher_subscriptions` instead of `subscriptions`
- In `customer.subscription.deleted` and `updated`: also check `teacher_subscriptions` table
- Map `teacher_plan` metadata value to the correct plan column

### 4. `src/App.tsx`
- Import `TeacherPricing`
- Add protected route: `/teacher/pricing`

### 5. `src/pages/TeacherDashboard.tsx`
- Add "Pricing" card (CreditCard icon) in the hero grid linking to `/teacher/pricing`

### 6. `src/pages/TeacherStudents.tsx`
- Before opening AddStudentModal, check teacher subscription plan from `teacher_subscriptions`
- If plan is `free` and student count >= 3, show upgrade prompt modal instead of add student modal
- Display a subtle banner when at 2/3 students: "You're using 2 of 3 free student slots"

### 7. `src/components/teacher/AddStudentModal.tsx`
- Accept an optional `studentLimitReached` prop
- If true, show upgrade prompt UI instead of the form

## No changes needed to `stripe-portal` -- it already works generically with any `stripe_customer_id`. The pricing page will query `teacher_subscriptions` for the customer ID and call the existing portal function.

## Enforcement Logic
- Free tier: max 3 students (checked client-side against `teacher_students` count before insert)
- Pro: unlimited students, all features
- Premium: same as Pro + future white-label flags

