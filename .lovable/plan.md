

## Complete Freemium Subscription System Implementation

### Overview
Implement a tiered subscription system with Stripe payments, promo codes, and access controls for video uploads and vocal exercises. This will enable monetization while maintaining a compelling free tier.

---

### Phase 1: Database Schema Setup

Create 3 new tables and update the existing profiles table to properly track subscriptions:

#### 1.1 Create `subscriptions` Table
Centralized subscription management (not on profiles table to separate concerns):

```sql
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'promo')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  promo_code TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage subscriptions" ON subscriptions FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');
```

#### 1.2 Create `user_video_uploads` Table
Track personal video uploads with duration for quota enforcement:

```sql
CREATE TABLE user_video_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES youtube_videos(id) ON DELETE CASCADE NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_uploads_user_date ON user_video_uploads(user_id, uploaded_at);
ALTER TABLE user_video_uploads ENABLE ROW LEVEL SECURITY;
-- RLS: Users can view their own, service role can insert
```

#### 1.3 Create `vocal_exercise_completions` Table
Track vocal exercise usage for free tier limits:

```sql
CREATE TABLE vocal_exercise_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES youtube_videos(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vocal_completions_user_date ON vocal_exercise_completions(user_id, completed_at);
ALTER TABLE vocal_exercise_completions ENABLE ROW LEVEL SECURITY;
```

#### 1.4 Create `promo_codes` Table

```sql
CREATE TABLE promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('unlimited', 'duration')),
  duration_months INTEGER,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Public read for code validation, service role for management
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
```

---

### Phase 2: Subscription Service Layer

Create a new service file `src/services/subscriptionService.ts` with core quota functions:

#### 2.1 Core Functions

```typescript
// Check if user can upload a video
async function canUserUploadVideo(userId: string, videoDurationSeconds: number): Promise<{
  allowed: boolean;
  reason?: string;
  uploadsUsed: number;
  uploadsLimit: number;
}>

// Check if user can do vocal exercise
async function canUserDoVocalExercise(userId: string): Promise<{
  allowed: boolean;
  count: number;
  limit: number;
}>

// Get user's subscription tier
async function getUserSubscription(userId: string): Promise<{
  tier: 'free' | 'premium' | 'promo';
  status: 'active' | 'cancelled' | 'expired';
  expiresAt: string | null;
}>

// Record video upload
async function recordVideoUpload(userId: string, videoId: string, durationSeconds: number): Promise<void>

// Record vocal exercise completion
async function recordVocalExerciseCompletion(userId: string, videoId: string): Promise<void>
```

#### 2.2 Subscription Limits Configuration

| Feature | Free | Premium |
|---------|------|---------|
| Video uploads/month | 2 | 10 |
| Max video length | 10 min | 15 min |
| Total duration/month | 20 min | 150 min |
| Vocal exercises/month | 5 | Unlimited |

---

### Phase 3: Update Existing Components

#### 3.1 Update `process-youtube-video` Edge Function
Add subscription quota checks before processing:

```typescript
// Add at start of function:
// 1. Check subscription tier
// 2. Validate video duration against limits
// 3. Check monthly upload quota
// 4. Return appropriate error if limits exceeded
```

#### 3.2 Update `YouTubeSpeaking.tsx`
Add vocal exercise quota checking:

- Before allowing recording, check `canUserDoVocalExercise()`
- If limit reached for free users, show upgrade prompt with "Skip to Flashcards" option
- Show usage indicator: "Vocal exercises: X/5 this month"

#### 3.3 Update `YouTubeExercises.tsx` Results Screen
After exercise completion, conditionally show speaking prompt:

```
If vocal quota NOT exceeded:
  → Show normal "Continue to Speaking Practice" button
  → For free users, show small text: "Vocal exercises: X/5 this month"

If vocal quota exceeded (free user):
  → Show upgrade modal with:
    - "Speaking Practice (Premium Feature)"
    - "You've used 5/5 free vocal exercises"
    - [Upgrade to Premium] button
    - [Skip to Flashcards] button
    - Reset date info
```

#### 3.4 Update `AppHome.tsx` Import Dialog
Add quota indicators and validation:

```
For Free Users:
  - Show progress bar: "1/2 uploads used this month"
  - After URL entry, validate duration before processing
  - If rejected, show upgrade modal

For Premium Users:
  - Show: "7/10 uploads used this month"
  - Optional: "Share with community?" checkbox
```

#### 3.5 Update `Lesson.tsx` State Machine
Add ability to skip speaking step:

```typescript
// New handler:
const handleSkipSpeaking = () => {
  setLessonState("flashcards");
};

// Pass to YouTubeExercises:
<YouTubeExercises
  ...
  onSkipToFlashcards={handleSkipSpeaking}
  vocalQuotaExceeded={vocalQuotaExceeded}
/>
```

---

### Phase 4: Stripe Integration

#### 4.1 Create `stripe-checkout` Edge Function

```typescript
// POST /functions/v1/stripe-checkout
// Creates Stripe Checkout session for $9.99/month subscription
// Returns: { url: string } for redirect

Input: { successUrl, cancelUrl }
Output: { url: "https://checkout.stripe.com/..." }
```

#### 4.2 Create `stripe-webhook` Edge Function

```typescript
// POST /functions/v1/stripe-webhook
// Handles Stripe webhook events:
// - checkout.session.completed → Set tier to 'premium'
// - customer.subscription.deleted → Set tier to 'free'
// - customer.subscription.updated → Handle plan changes
```

#### 4.3 Required Secrets
Need to add via Supabase secrets:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

---

### Phase 5: Premium Landing Page

Create new route `/premium` with components:

#### 5.1 Page Structure
- Hero section with pricing ($9.99/month)
- Benefits grid (6 key features)
- Comparison table (Free vs Premium)
- Primary CTA → Stripe Checkout
- Promo code redemption section

#### 5.2 Files to Create
- `src/pages/Premium.tsx` - Main premium page
- `src/components/subscription/PricingCard.tsx` - Feature display
- `src/components/subscription/ComparisonTable.tsx` - Free vs Premium
- `src/components/subscription/PromoCodeInput.tsx` - Reusable promo input

---

### Phase 6: Promo Code System

#### 6.1 Create `redeem-promo-code` Edge Function

```typescript
// POST /functions/v1/redeem-promo-code
// Input: { code: string }
// Validates code, applies to user subscription
// Returns: { success, message, expiresAt? }
```

#### 6.2 Promo Code UI Locations
1. **Settings page** - Dedicated section
2. **All paywall modals** - "OR" divider + input
3. **Premium page** - Below main CTA
4. **Post-signup banner** - Dismissible welcome prompt

---

### Phase 7: Profile Page Updates

Update `ProfilePage.tsx` to show subscription status:

```
┌─────────────────────────────────────┐
│ Your Plan: Free                      │
│                                      │
│ This Month:                          │
│ • Video uploads: 1/2                 │
│ • Vocal exercises: 3/5               │
│                                      │
│ Resets: Feb 1, 2026                 │
│                                      │
│ [💎 Upgrade to Premium →]           │
└─────────────────────────────────────┘
```

---

### Phase 8: Admin Panel (Optional)

Create `/admin/promo-codes` route for code management:
- Form to create new codes
- Table of existing codes with usage stats
- Toggle active/inactive status

(Protected by admin role check)

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/services/subscriptionService.ts` | Core subscription/quota logic |
| `src/pages/Premium.tsx` | Premium landing page |
| `src/components/subscription/PricingCard.tsx` | Feature cards |
| `src/components/subscription/ComparisonTable.tsx` | Free vs Premium |
| `src/components/subscription/PromoCodeInput.tsx` | Reusable promo input |
| `src/components/subscription/UpgradePrompt.tsx` | Paywall modal |
| `src/components/subscription/QuotaIndicator.tsx` | Usage progress bar |
| `src/hooks/useSubscription.tsx` | Subscription state hook |
| `supabase/functions/stripe-checkout/index.ts` | Stripe checkout creation |
| `supabase/functions/stripe-webhook/index.ts` | Stripe event handler |
| `supabase/functions/redeem-promo-code/index.ts` | Promo code redemption |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/AppHome.tsx` | Add quota checks to import dialog |
| `src/pages/Lesson.tsx` | Add skip speaking option, quota tracking |
| `src/components/YouTubeExercises.tsx` | Show vocal quota status, upgrade prompt |
| `src/components/YouTubeSpeaking.tsx` | Check quota before recording, record completion |
| `src/components/ProfilePage.tsx` | Add subscription section |
| `src/App.tsx` | Add /premium route |
| `supabase/functions/process-youtube-video/index.ts` | Add quota validation |
| `supabase/config.toml` | Add new edge function configs |

---

### Implementation Order

1. **Database migrations** - Create all tables with RLS
2. **subscriptionService.ts** - Core quota logic
3. **useSubscription hook** - React hook for subscription state
4. **Update YouTubeSpeaking** - Add vocal quota checks
5. **Update YouTubeExercises** - Add upgrade prompt on quota exceeded
6. **Update AppHome** - Add upload quota checks
7. **Premium page** - Landing page with benefits
8. **Stripe edge functions** - Payment integration
9. **Promo code system** - Redemption logic
10. **Profile page updates** - Show subscription status

---

### Cost Analysis

With these limits:
- **Free tier cost**: ~$0.18/user max (2 uploads × 10 min + 5 vocal)
- **Premium revenue**: $9.99/month
- **Break-even**: 2-3% conversion rate

This provides a sustainable freemium model while preserving a compelling free experience.

