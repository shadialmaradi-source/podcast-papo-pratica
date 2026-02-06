

# Fix Stripe Payment Flow, Webhook, Post-Payment UX, and Subscription Management

## Problems Identified

### 1. CRITICAL: Webhook is completely broken
The `stripe-webhook` edge function crashes on every Stripe event. The error:
```
SubtleCryptoProvider cannot be used in a synchronous context.
Use `await constructEventAsync(...)` instead of `constructEvent(...)`
```
The code uses `stripe.webhooks.constructEvent()` (synchronous), but Deno's runtime requires the async version `stripe.webhooks.constructEventAsync()`. This means:
- Stripe charges the customer successfully
- Stripe sends the webhook event to your server
- The webhook **crashes** before processing
- The database is **never updated** with premium status or Stripe IDs
- Result: payment goes through but user stays on their previous tier

### 2. Post-payment redirect lands on a dead-end
After Stripe checkout completes, the user is redirected to `/premium?success=true`. This page shows a toast message but:
- No "Go to Profile" or "Go to Dashboard" button appears
- The back arrow uses `navigate(-1)` which goes to Stripe's page (external), not your app
- The user is stuck on the Premium page with no clear next step

### 3. No subscription management for users
- Users cannot check if their subscription is recurring
- Users cannot cancel their subscription
- No link to Stripe's Customer Portal for billing history

### 4. No payment confirmation email
- Stripe can send automatic receipt emails, but this is a Stripe Dashboard setting (not code)
- The webhook could trigger an email via Resend, but since the webhook is broken, nothing happens

---

## Solution

### Fix 1: Repair the webhook (stripe-webhook edge function)
Change `constructEvent` to `constructEventAsync` with `await`:

```typescript
// Before (broken):
event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

// After (working):
event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
```

This single line fix will make the entire payment flow work: Stripe events will be properly verified and processed, updating the user's subscription tier to `premium` with the correct Stripe customer and subscription IDs.

### Fix 2: Improve post-payment experience (Premium.tsx)
When `?success=true` is in the URL:
- Show a success state with a congratulations message instead of the regular pricing page
- Add prominent "Go to Dashboard" and "View Profile" buttons
- Remove the upgrade buttons (user just paid)

### Fix 3: Create Stripe Customer Portal (new edge function + UI)
- **New edge function**: `stripe-portal` -- creates a Stripe Customer Portal session where users can view invoices, update payment method, and cancel subscription
- **Profile page update**: Add a "Manage Subscription" button next to the subscription badge in the Settings section (only shown for Stripe-paying premium users, not promo users)

### Fix 4: Enable Stripe receipt emails
This requires a setting change in the Stripe Dashboard (Settings > Emails > Successful payments). This cannot be done via code, so I will add a note about it. Additionally, the Stripe Customer Portal (Fix 3) will give users access to their full billing history and invoices.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/stripe-webhook/index.ts` | Modify | Change `constructEvent` to `await constructEventAsync` |
| `supabase/functions/stripe-portal/index.ts` | Create | New edge function for Stripe Customer Portal sessions |
| `src/pages/Premium.tsx` | Modify | Add post-payment success screen with navigation buttons |
| `src/components/ProfilePage.tsx` | Modify | Add "Manage Subscription" button that opens Stripe Portal |

---

## Post-Implementation Steps (Manual)

To enable automatic payment receipt emails, you will need to go to your Stripe Dashboard:
1. Go to **Settings > Emails** in your Stripe Dashboard
2. Enable **"Successful payments"** to send receipts automatically
3. Optionally enable **"Failed payments"** for failed payment notifications

To fix the existing subscription record (since the webhook was broken when you paid):
- If you want to keep using the promo code access, no action needed
- If you want to verify the Stripe payment flow works, I can provide a SQL query to reset your subscription so you can test again after deploying the webhook fix

