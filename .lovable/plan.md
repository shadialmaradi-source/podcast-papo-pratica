## Diagnosis

Your code is working correctly. The network logs confirm `stripe-checkout` returns a valid Stripe URL (status 200, `https://checkout.stripe.com/c/pay/cs_live_...`) within milliseconds. The blank skeleton page in your screenshot **is Stripe's own checkout page failing to render**, not your app.

### Root cause

Stripe sets `X-Frame-Options: DENY` on `checkout.stripe.com` to prevent clickjacking. The Lovable preview shows your app inside an iframe (`https://479ee1fc-...lovableproject.com` embedded in `lovable.app`). When `Premium.tsx` line 102 runs:

```ts
window.location.href = data.url;
```

it navigates the **iframe** to Stripe. The browser blocks the load → blank skeleton screen.

This will also affect users who embed your app or open it from any context that puts it inside an iframe. In a regular browser tab (no iframe) it works fine — that's why this only shows up in the preview.

## Fix

In `src/pages/Premium.tsx`, change the redirect to break out of the iframe to the top-level window, with a safe fallback to opening in a new tab if the parent frame is cross-origin and inaccessible.

```ts
if (response.ok && data?.url) {
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = data.url;   // break out of iframe
    } else {
      window.location.href = data.url;        // normal tab
    }
  } catch {
    window.open(data.url, '_blank', 'noopener,noreferrer'); // cross-origin fallback
  }
}
```

### Files touched

- **Edit** `src/pages/Premium.tsx` — replace the single `window.location.href = data.url` line with the iframe-aware navigation above.

### Out of scope

- No backend / edge function changes (the function works correctly).
- No changes to the Stripe product, key, or webhook configuration.
- The teacher checkout (`teacher-stripe-checkout`) is not affected by this report, but if you want, I can apply the same iframe-breakout fix to `TeacherPricing.tsx` in the same edit — let me know.
