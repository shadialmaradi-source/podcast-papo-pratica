

# Plan: Video Duration Check in extract-youtube-transcript Edge Function

## Analysis

The `extract-youtube-transcript` edge function currently has no duration check. However, for teacher lesson creation, the transcript is actually fetched inside `generate-lesson-exercises-by-type` (which calls Supadata directly), not via `extract-youtube-transcript`. Both paths need the check.

The challenge: `extract-youtube-transcript` has `verify_jwt = false` and doesn't know who's calling. We need a way to pass the teacher context.

## Approach

Add an **optional** `teacherId` parameter to `extract-youtube-transcript`. When provided, the function:
1. Fetches video duration via YouTube Data API (using `YOUTUBE_DATA_API_KEY` secret, already configured)
2. Looks up the teacher's plan from `teacher_subscriptions`
3. Rejects if duration exceeds plan limit (free=5min, pro=10min, premium=15min)

When `teacherId` is not provided (student usage), skip the check — students have their own quota system.

Also add the same duration check in `generate-lesson-exercises-by-type` since that's the actual teacher lesson creation path.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/extract-youtube-transcript/index.ts` | Add optional `teacherId` param, YouTube Data API duration check, plan lookup |
| `supabase/functions/generate-lesson-exercises-by-type/index.ts` | Add duration check before fetching transcript |
| `src/services/youtubeService.ts` | Pass `teacherId` when calling from teacher context (optional enhancement) |

## Duration Check Logic (shared)

```text
1. Call YouTube Data API: GET /videos?part=contentDetails&id={videoId}&key={API_KEY}
2. Parse ISO 8601 duration (PT3M45S → 3.75 minutes)
3. Look up teacher plan from teacher_subscriptions (using service role client)
4. Compare against limits: free=5, pro=10, premium=15
5. If exceeded → return error with plan info and upgrade message
```

## Edge Cases
- Video duration unavailable → allow (don't block on uncertainty)
- No `teacherId` passed → skip check (backward compatible)
- No subscription record → default to free plan limits

