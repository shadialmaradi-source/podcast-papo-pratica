

# Fix Premium Page: Promo Code & Payment Button Issues + Mobile Check

## Summary
The Premium page has two broken flows that need fixing, plus a mobile responsiveness audit is needed:

1. **Promo code redemption silently fails** when the user is logged in but the error message is misleading
2. **"Get Premium Now" button does nothing** with no feedback when Stripe checkout fails  
3. **Mobile responsiveness** needs verification across key pages

## Root Cause Analysis

### Issue 1: Promo Code Shows Wrong Error
In `PromoCodeInput.tsx`, line 24:
```typescript
if (!code.trim() || !user?.id) {
  toast.error("Please enter a promo code");
  return;
}
```
This combines two checks in one condition. When the user IS logged in but something else goes wrong, the error message is misleading. Also, `supabase.functions.invoke` swallows HTTP error responses -- when the edge function returns a non-2xx status (e.g., 401, 400), the Supabase client wraps it as a generic `FunctionsHttpError`, making the actual error message from the JSON body inaccessible. This means even valid error responses like "Invalid promo code" never reach the UI.

### Issue 2: Stripe Checkout Button Fails Silently  
The `handleUpgrade` function calls `supabase.functions.invoke('stripe-checkout', ...)`. Same issue -- the Supabase client's `functions.invoke` treats non-2xx responses as errors, throwing away the JSON body. Additionally, if `STRIPE_SECRET_KEY` is not set to a valid production key, the checkout creation fails server-side and the client only sees a generic error.

### Common Fix: Use Direct `fetch` Instead of `supabase.functions.invoke`
The project already established this pattern in `AppHome.tsx` (as noted in the project memory: "AppHome.tsx uses direct fetch calls instead of supabase.functions.invoke to communicate with edge functions"). This approach allows the UI to parse the actual JSON error response and display specific messages.

---

## Changes

### 1. Fix `PromoCodeInput.tsx`
- **Separate the validation checks**: Show "Please sign in first" when `!user?.id`, and "Please enter a promo code" when `!code.trim()`
- **Switch from `supabase.functions.invoke` to direct `fetch`** so we can read the actual JSON response body with specific error messages
- **Add a "Please sign in" redirect**: When user is not logged in, show a clear message and optionally redirect to `/auth`

### 2. Fix `Premium.tsx` - handleUpgrade function
- **Switch from `supabase.functions.invoke` to direct `fetch`** for the stripe-checkout call
- **Parse the actual error message** from the response JSON and display it via toast
- **Better error handling**: Show specific messages like "Payment system not configured" instead of generic "Unable to start checkout"

### 3. Mobile Responsiveness Check
After fixing the functional bugs, I'll open the app in a mobile viewport (390x844) and verify the following pages render correctly:
- Landing page (`/`)
- Premium page (`/premium`)
- App home (`/app`)
- Library (`/library`)

---

## Technical Details

### PromoCodeInput.tsx Changes
```typescript
// Before (broken):
const { data, error } = await supabase.functions.invoke('redeem-promo-code', {
  body: { code: code.trim().toUpperCase() },
});
if (error) throw error;

// After (working):
const { data: { session } } = await supabase.auth.getSession();
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/redeem-promo-code`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  }
);
const data = await response.json();
```

### Premium.tsx Changes
Same pattern for stripe-checkout:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/stripe-checkout`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ successUrl, cancelUrl }),
  }
);
const data = await response.json();
```

### Files Modified
| File | Change |
|------|--------|
| `src/components/subscription/PromoCodeInput.tsx` | Switch to direct fetch, fix error messages, add auth check |
| `src/pages/Premium.tsx` | Switch stripe-checkout to direct fetch, improve error handling |
| `src/components/subscription/UpgradePrompt.tsx` | Fix PromoCodeInput behavior inherited from the component |

