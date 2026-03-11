

# Fix: Speech analysis always transcribes as Spanish

## Root Cause

In `supabase/functions/speech-analyze/index.ts`, line 147:
```
formData.append("language", "es");
```
This is hardcoded to Spanish. The client (`LessonSpeaking.tsx`) knows the correct language but never passes it in the request body.

## Changes

### 1. Client: Send language in request (`src/components/lesson/LessonSpeaking.tsx`)

In the `analyzeSpeech` function (line ~164), add `language` to the JSON body sent to the edge function.

### 2. Edge Function: Use dynamic language (`supabase/functions/speech-analyze/index.ts`)

- Extract `language` from the request body (alongside `audioBase64`, `mode`, etc.)
- Map app language codes to Whisper ISO-639-1 codes: `{ portuguese: "pt", english: "en", spanish: "es", italian: "it" }`
- Use the mapped code instead of hardcoded `"es"`

**Files to edit:**
- `src/components/lesson/LessonSpeaking.tsx` — add `language` to request body
- `supabase/functions/speech-analyze/index.ts` — read `language` param, map to Whisper code, use dynamically

