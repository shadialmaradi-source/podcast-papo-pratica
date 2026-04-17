

# Fix Build Error: `notify-teacher-email` import

## Root cause
`supabase/functions/notify-teacher-email/index.ts` line 3 imports `npm:resend@2.0.0`, which Deno can't resolve in this environment. This is the only build error blocking the preview — that's why you're seeing the runtime error loop (the app can't load and React Router keeps retrying).

## Fix
Change the import to the Deno-compatible ESM URL:
```ts
import { Resend } from "https://esm.sh/resend@2.0.0";
```
(Same pattern other edge functions in this project already use.)

## About the onboarding reminder
Already implemented and still correct after the recent shared-lesson work:
- `AuthCallback.tsx` checks `requiresOnboarding(profile)` — returning users with a populated profile skip onboarding.
- Shared-lesson flow: `hydrateProfileFromLesson()` fills in language/native/level from the teacher's lesson, then routes straight to `/lesson/student/<token>`.

No changes needed there. Once the build error is fixed, both flows will work as designed.

## Files changed
| File | Change |
|---|---|
| `supabase/functions/notify-teacher-email/index.ts` | Replace `npm:resend@2.0.0` import with `https://esm.sh/resend@2.0.0` |

