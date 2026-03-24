

# Legal-Navigation Completion Patch — 1 File

## Current State
- `LandingFooter.tsx` already lists Privacy Policy, Terms of Service, and Cookie Policy.
- `TermsOfService.tsx` page exists and route `/terms` is registered in `App.tsx`.
- Both landing pages already render `<LandingFooter />`.
- **Gap**: `Auth.tsx` has no legal links. Users entering the auth flow cannot see Privacy Policy, Terms of Service, or Cookie Policy.

## Change

### `src/pages/Auth.tsx` (line ~523, after the "wrong account type" div)
Add a small legal links row at the bottom of the Card:

```tsx
<div className="text-center text-xs text-muted-foreground pt-2 space-x-3">
  <a href="/privacy" className="hover:underline">Privacy Policy</a>
  <span>·</span>
  <a href="/terms" className="hover:underline">Terms of Service</a>
  <span>·</span>
  <a href="/cookies" className="hover:underline">Cookie Policy</a>
</div>
```

## Summary

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Add legal links row below the auth card content |

1 file, ~7 lines added. No architectural changes.

