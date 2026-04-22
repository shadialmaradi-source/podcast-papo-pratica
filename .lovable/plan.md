
## Replace the broken YouTube audio resolver

### Root cause (confirmed by logs)

```
[voxtral] player API HTTP 400
[whisper] No audio URL resolved
```

`getYouTubeAudioUrl()` calls `https://www.youtube.com/youtubei/v1/player` with a **hardcoded ANDROID-client API key from 2018**. YouTube has since rotated keys and tightened that endpoint — it now returns 400 from server IPs. So Whisper and Voxtral never receive any audio. The chain ends with `null`, the video stays at `status='pending'`, and `segment-video-scenes` keeps logging `transcript_not_ready`.

So even though Supadata + timedtext also have no captions for this Brazilian BBC video (no `pt-BR` track is published), the ASR fallbacks can't run because we can't get the audio bytes in the first place.

### Fix: swap the audio resolver to a maintained service

The cleanest, most reliable option from a Deno edge function is **Supadata's audio endpoint** (`/v1/youtube/video` or `/v1/youtube/audio` — Supadata already powers our caption path and is documented to expose audio download URLs). It returns a short-lived direct stream URL that we can pipe straight into Whisper.

```text
getYouTubeAudioUrl(videoId)
  └── GET https://api.supadata.ai/v1/youtube/video?videoId=…&audio=true
        x-api-key: SUPADATA_API_KEY
  └── return audioUrl from JSON response
```

If Supadata's audio endpoint is not enabled on the current plan, the resolver falls back to a second provider (`https://yt-dlp-api.fly.dev/audio?id=…` style hosted resolver — keyed by env var). Both are tiny swap-ins behind the same `getYouTubeAudioUrl` function, so the rest of the chain is untouched.

### Implementation

**File:** `supabase/functions/extract-youtube-transcript/index.ts`

1. **Rewrite `getYouTubeAudioUrl(videoId)`**:
   - Try `SUPADATA_API_KEY` → call Supadata audio endpoint, return URL.
   - On failure, try optional `AUDIO_RESOLVER_URL` env (a hosted yt-dlp microservice) — return URL.
   - Log the chosen method (`[audio] resolved via supadata|fallback`) so we can see which path worked.
   - Return `null` only if both fail; existing Whisper/Voxtral logging already handles that gracefully.

2. **Drop the dead `youtubei/v1/player` call entirely.** It's the source of the HTTP 400 noise and it will never come back.

3. **Add one safety net:** if `getYouTubeAudioUrl` returns `null`, log a clear actionable line (`[audio] no resolver available — set SUPADATA_API_KEY or AUDIO_RESOLVER_URL`) so future debugging is one log line, not a stack trace hunt.

### Why also explain the second lesson card

`/teacher/lesson/6dfa46c8-…` shows the same video, no scenes, no transcript — same root cause. It points at the **same `youtube_videos` row** as `9f30ba71-…` (deduped by `video_id=tl-Pu3lFh7Q`). Once the resolver is fixed and the row is reset to `pending`, both lesson URLs will populate from the same successful Whisper run.

### Recovery after the fix

- Reset `youtube_videos` row for `tl-Pu3lFh7Q` to `status='pending'`, clear `processed_at` and `processing_started_at`. Same single-row UPDATE migration as before.
- Visit either lesson URL → `extract-youtube-transcript` runs → resolver returns audio URL → Whisper transcribes Portuguese → transcript saved → `segment-video-scenes` succeeds → scenes appear.

### Files touched

- `supabase/functions/extract-youtube-transcript/index.ts` — rewrite `getYouTubeAudioUrl` to use Supadata audio endpoint with optional fallback resolver; remove the dead `youtubei/v1/player` block; add clearer logs.
- One-off migration — reset `youtube_videos` row for `tl-Pu3lFh7Q` to `pending`.
- No client changes; no new secrets required (uses existing `SUPADATA_API_KEY`; `AUDIO_RESOLVER_URL` optional).

### Open question before I build

Supadata's audio endpoint might require a higher tier than the captions endpoint. If it does, I have two clean alternatives — pick one:

- **A. Use a hosted yt-dlp service** (e.g. a tiny Fly.io / Render service running `yt-dlp`). One env var (`AUDIO_RESOLVER_URL`), most reliable long-term, ~free to host.
- **B. Use `https://www.youtube.com/get_video_info`-style scraping in the edge function** — no extra service, but breaks every few months when YouTube changes signatures (this is exactly why the current code died).

I recommend **A**. If you say "go", I'll implement Supadata-first + leave a documented `AUDIO_RESOLVER_URL` slot so you can plug in option A later without another code change.
