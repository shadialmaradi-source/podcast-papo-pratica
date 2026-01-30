

## Complete Freemium System - Remaining Integration Tasks

### Overview
The core freemium infrastructure is complete, but there are a few remaining integration gaps to address before the system is fully functional.

---

### Task 1: Connect Skip-to-Flashcards in Lesson Flow

**Problem**: The `onSkipToFlashcards` prop is defined in `YouTubeExercises` but not being passed from `Lesson.tsx`.

**File: `src/pages/Lesson.tsx`**

Add a handler for skipping speaking practice and pass it to YouTubeExercises:

```typescript
// Add new handler
const handleSkipToFlashcards = () => {
  setLessonState("flashcards");
};

// Update YouTubeExercises usage
<YouTubeExercises
  videoId={videoId}
  level={selectedLevel}
  intensity="intense"
  onBack={handleBack}
  onComplete={handleExercisesComplete}
  onContinueToSpeaking={handleContinueToSpeaking}
  onTryNextLevel={handleTryNextLevel}
  onSkipToFlashcards={handleSkipToFlashcards}  // ADD THIS
/>
```

---

### Task 2: Add Analytics Tracking for Premium/Payment Events

**Problem**: PostHog events for `premium_viewed`, `payment_initiated`, and `payment_completed` are not implemented.

**File: `src/pages/Premium.tsx`**

Add tracking calls:

```typescript
import { trackEvent } from "@/lib/analytics";

// Track page view on mount
useEffect(() => {
  trackEvent('premium_viewed', {
    source: new URLSearchParams(window.location.search).get('source') || 'direct',
    timestamp: new Date().toISOString()
  });
}, []);

// Track payment initiation in handleUpgrade
trackEvent('payment_initiated', {
  plan_type: 'monthly',
  price: 9.99,
  timestamp: new Date().toISOString()
});

// Track successful payment (check URL params)
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === 'true') {
    trackEvent('payment_completed', {
      plan_type: 'monthly',
      amount: 9.99,
      currency: 'USD',
      timestamp: new Date().toISOString()
    });
  }
}, []);
```

---

### Task 3: Add Stripe API Keys (User Action Required)

**Problem**: The Stripe edge functions require `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` secrets which are not configured.

**Action Required from You**:
1. Go to your Stripe Dashboard
2. Get your **Secret Key** (starts with `sk_test_` or `sk_live_`)
3. Create a webhook endpoint pointing to your edge function URL
4. Get the **Webhook Signing Secret** (starts with `whsec_`)

After you provide these keys, they'll be added to Supabase Edge Function secrets.

---

### Task 4: Track Promo Code Redemption in Analytics

**File: `src/components/subscription/PromoCodeInput.tsx`**

Add tracking when a promo code is successfully redeemed:

```typescript
import { trackEvent } from "@/lib/analytics";

// After successful redemption
trackEvent('promo_code_redeemed', {
  code_type: 'unknown', // We don't expose this from the API
  timestamp: new Date().toISOString()
});
```

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/pages/Lesson.tsx` | Add `handleSkipToFlashcards` and pass to `YouTubeExercises` |
| `src/pages/Premium.tsx` | Add `premium_viewed`, `payment_initiated`, `payment_completed` analytics |
| `src/components/subscription/PromoCodeInput.tsx` | Add promo code redemption tracking |

---

### Technical Notes

- The database schema, service layer, and core UI components are fully implemented
- Stripe edge functions are ready and deployed, but require API keys to function
- Once Stripe keys are added, the full payment flow will be operational
- All quota enforcement logic is in place and working

