
## Add OpenAI Whisper as a (more reliable) plan C

You already have `OPENAI_API_KEY` set. Whisper uses the same multipart audio upload pattern as Voxtral, so we can plug it into the existing chain with very little code.

### Updated provider chain

```text
1. Supadata             — captions (everyone)
2. YouTube timedtext    — captions (everyone)
3. OpenAI Whisper       — audio ASR (TEACHERS ONLY)   ← NEW primary ASR
4. Voxtral (Mistral)    — audio ASR (TEACHERS ONLY)   ← kept as last-resort backup
```

Whisper becomes the primary ASR because:
- `OPENAI_API_KEY` is already configured and proven working in this project.
- `whisper-1` reliably handles Portuguese, Italian, English, etc.
- Mistral Voxtral integration may be failing silently (no logs from `extract-youtube-transcript` at all → suggests the function may not even be reached, or audio resolution / multipart upload is breaking before Mistral sees it). Whisper gives us a known-good path while we keep Voxtral as a fallback.

### Implementation in `supabase/functions/extract-youtube-transcript/index.ts`

Add a new helper `tryWhisper(videoId, languageHint)` modeled exactly on `tryVoxtral`, reusing the existing `getYouTubeAudioUrl()`:

```ts
async function tryWhisper(videoId, languageHint) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) return null;

  const audioUrl = await getYouTubeAudioUrl(videoId);
  if (!audioUrl) return null;

  const audioBlob = await (await fetch(audioUrl)).blob();
  // 25 MB hard cap (Whisper limit)
  if (audioBlob.size > 25 * 1024 * 1024) {
    console.log('[whisper] audio > 25MB, skipping');
    return null;
  }

  const form = new FormData();
  form.append('file', audioBlob, 'audio.webm');
  form.append('model', 'whisper-1');
  form.append('response_format', 'json');
  if (languageHint) form.append('language', languageHint.slice(0, 2));

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });
  if (!res.ok) { console.error('[whisper]', res.status, await res.text()); return null; }
  const j = await res.json();
  return j.text?.length > 50 ? { text: j.text, lang: languageHint || 'unknown', method: 'whisper' } : null;
}
```

Update the chain so teachers try Whisper before Voxtral:

```ts
result = await trySupadata(id);
if (!result) result = await tryYouTubeTimedText(id);
if (!result && callerRole === 'teacher') result = await tryWhisper(id, languageHint);
if (!result && callerRole === 'teacher') result = await tryVoxtral(id, languageHint);
```

Keep the existing 15-minute teacher cap (Whisper also bills per minute — `whisper-1` is ~$0.006/min, very cheap).

### Diagnostics for the stuck lesson

`extract-youtube-transcript` logs returned **nothing** — the function may not be getting invoked at all, or the most recent attempt errored before logging. After deploy I'll:

1. Reset `youtube_videos` row for `9f30ba71-…` / `tl-Pu3lFh7Q` back to `status='pending'`.
2. Hit the function directly with `curl_edge_functions` to confirm the chain runs end-to-end and tag exactly which method succeeded (`supadata` / `timedtext` / `whisper` / `voxtral` / `null`).
3. If Whisper succeeds, the lesson will populate. If even Whisper fails, the failure card from the previous patch will show **Try again / Pick a different video** instead of looping.

### Cost guardrails (kept)

- Whisper + Voxtral only run for teacher role (admin email override included).
- Hard 15-minute audio cap before either ASR call.
- Whisper-specific 25 MB file-size cap (OpenAI's hard limit).
- Each provider tagged in logs (`[transcript] method=...`) so we can see in Supabase logs which path each lesson took.

### Files touched

- `supabase/functions/extract-youtube-transcript/index.ts` — add `tryWhisper`, insert it between timedtext and Voxtral in the chain, log selected method.
- One-off DB action — re-reset `youtube_videos` row for `9f30ba71-…` to `pending`, then re-invoke the function via `curl_edge_functions` to verify and surface the real failure reason in logs.
- No new secrets needed — `OPENAI_API_KEY` already present.
- No client changes — failure UX from the previous patch already covers the all-providers-fail case.
