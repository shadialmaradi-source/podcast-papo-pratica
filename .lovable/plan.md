
## Plan B/C transcript fallback — role-aware

### Two unrelated things to handle

**1. Build error (blocking everything)**
`supabase/functions/send-weekly-recaps/index.ts` imports `npm:resend@2.0.0`, which the current Deno runtime can't resolve. Fix: change the import to the esm.sh form used elsewhere in the project (e.g. `https://esm.sh/resend@2.0.0`). One-line edit, unrelated to transcripts but must ship first or nothing deploys.

**2. Transcript fallback chain with role gating**

Today: `extract-youtube-transcript` calls Supadata only. If Supadata fails (no captions, like your Brazilian video `tl-Pu3lFh7Q`), the lesson dies.

New chain inside `supabase/functions/extract-youtube-transcript/index.ts`:

```text
1. Supadata           — captions, fast, cheap            (everyone)
2. YouTube timedtext  — captions, free, no key           (everyone)
3. Voxtral (Mistral)  — audio ASR, paid per minute       (TEACHERS ONLY)
```

Voxtral is gated by **caller role**, not by URL flag:
- The function already authenticates the user (`claimsData.claims.sub`).
- Look up the user's role via `user_roles` (same pattern as `resolveUserRole` in `src/lib/accessControl.ts`) inside the edge function using the service-role client.
- If role = `teacher` → allow Voxtral fallback.
- If role = `student` → stop after step 2 and return `NO_TRANSCRIPT_AVAILABLE` with a clear message ("This video has no captions. Ask your teacher to add it, or try a different video.").
- Admin override email (`shadi.almaradi@gmail.com`) is treated as teacher.

### Voxtral integration details

- Endpoint: `POST https://api.mistral.ai/v1/audio/transcriptions`
- Model: `voxtral-mini-latest` (cheap default; `voxtral-small-latest` reserved for future).
- Auth: `Authorization: Bearer ${MISTRAL_API_KEY}`.
- Audio source: fetch the YouTube audio stream server-side via a yt-dlp-style HTTPS resolver. Cleanest option for the edge runtime is a hosted resolver call — I'll implement using a small `getYouTubeAudioUrl(videoId)` helper that hits `https://www.youtube.com/youtubei/v1/player` to get an `audio/webm` stream URL, then forwards bytes to Mistral as multipart. If that proves flaky in production we swap in a managed yt-dlp microservice — single helper to swap.
- Hard caps before invoking Voxtral:
  - Skip if `getVideoDurationMinutes()` > teacher plan limit (already implemented above).
  - Absolute ceiling: 15 minutes regardless of plan.
- Logging: tag `[transcript] method=supadata|timedtext|voxtral` so we can monitor cost.

### Recover the stuck lesson

For `9f30ba71-6c73-433d-9883-447ac2788158` (`tl-Pu3lFh7Q`): once the new code deploys, reset that `youtube_videos` row to `status='pending'` so revisiting the page re-runs the chain. Since this lesson belongs to a teacher, Voxtral will pick it up.

### Failure UX (kept from previous plan)

`src/hooks/useLessonFlow.ts` + `src/pages/Lesson.tsx`: shorter retry budget, single toast, and a real failure card with **Try again** / **Pick a different video** buttons when all providers fail.

### Secrets

- `MISTRAL_API_KEY` — you provided it (`HwnH5ONSYwHd58kVvwz9kcx2VG3jpJgl`). I'll add it via the secrets tool when implementing; not stored in code.

### Files touched

- `supabase/functions/send-weekly-recaps/index.ts` — fix `npm:resend` import to esm.sh form to unblock builds.
- `supabase/functions/extract-youtube-transcript/index.ts` — add `tryYouTubeTimedText`, `tryVoxtral`, role lookup, chain providers, enforce duration cap + teacher-only Voxtral.
- One-off DB action — reset `youtube_videos` row for `9f30ba71-…` to retry through the new chain.
- `src/hooks/useLessonFlow.ts` — fewer retries, longer interval, single toast, faster stale detection.
- `src/pages/Lesson.tsx` — failure card with Try again / Library actions when all providers fail.
- New runtime secret: `MISTRAL_API_KEY`.
