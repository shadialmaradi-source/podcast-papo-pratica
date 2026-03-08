

# Plan: Internal Founder Video Import Tool

## Summary

Create a hidden `/admin/import` page accessible only to founders (hardcoded user IDs) that lets you paste a YouTube URL + transcript. The system then fetches video metadata (title, thumbnail, duration), detects language from the transcript via AI, extracts topics, and saves everything to the community library -- skipping the Supadata transcript API entirely.

## Implementation

### 1. New Edge Function: `admin-import-video`

Reuses the existing logic from `process-youtube-video` but:
- Accepts `{ videoUrl, transcript, language? }` -- transcript is provided by the user
- Skips `extractTranscriptFromCaptions` (no Supadata call)
- Skips duration check and upload quota tracking
- Still fetches video metadata via oEmbed (title, thumbnail)
- Still fetches duration via YouTube Data API (for DB storage, not for blocking)
- Still runs `extractTopicsFromTranscript` via AI
- Saves to `youtube_videos` (is_curated: false, status: completed) + `youtube_transcripts` + `video_topics`
- Validates caller is a founder via a hardcoded allow-list of user IDs
- Auto-detects language from transcript via AI if not provided

### 2. New Page: `src/pages/AdminImport.tsx`

Simple form with:
- YouTube URL input
- Language dropdown (english, spanish, italian, portuguese, french, german) with auto-detect option
- Large textarea for pasting transcript
- Optional difficulty level selector (defaults to beginner)
- "Import" button
- Status/result display with link to the new lesson

Protected by checking `user.id` against a hardcoded founder list. If not a founder, redirects to `/app`.

### 3. Route in `App.tsx`

Add `/admin/import` as a protected route pointing to `AdminImport`.

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/admin-import-video/index.ts` | New edge function -- metadata fetch + transcript save + topic extraction, no Supadata |
| `supabase/config.toml` | Add function config with `verify_jwt = false` |
| `src/pages/AdminImport.tsx` | New page with URL + transcript form |
| `src/App.tsx` | Add `/admin/import` route |

## Security

- Edge function validates the caller's user ID against a hardcoded founder allow-list
- Page also checks client-side before rendering (UX only, real check is server-side)
- No RLS changes needed -- edge function uses service role key

