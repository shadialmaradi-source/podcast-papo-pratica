

## Fix Video Duration Limit and Localize Practice Exercises

### Problem Summary

1. **30-minute video was accepted**: The edge function duration check failed because `getVideoDuration()` returned 0 (API issue). When duration is 0, videos pass the limit check.

2. **Italian text in Practice Exercises UI**: The component has hardcoded Italian strings like "Cosa praticherai:", "Vocabolario dal video", etc. that should be English per the default localization standard.

---

### Task 1: Fix Duration Enforcement in Edge Function

**File: `supabase/functions/process-youtube-video/index.ts`**

The current logic at lines 52-66:
```typescript
const MAX_DURATION_SECONDS = 600; // 10 minutes
let videoDuration = 0;

if (!skipDurationCheck) {
  videoDuration = await getVideoDuration(videoId);
  if (videoDuration > MAX_DURATION_SECONDS) {
    throw new Error(...)
  }
}
```

**Problem**: When `getVideoDuration()` returns 0 (API failure or missing key), the check passes silently.

**Solution**: If we cannot verify the duration, we should either:
- Block the upload with an error (safer)
- Or log a warning and allow with caution

**Recommended Change**: Require successful duration verification before allowing upload:
```typescript
if (!skipDurationCheck) {
  videoDuration = await getVideoDuration(videoId);
  
  // If we couldn't get duration, block the upload
  if (videoDuration === 0) {
    throw new Error('Unable to verify video duration. Please try again or contact support.');
  }
  
  if (videoDuration > MAX_DURATION_SECONDS) {
    const durationMins = Math.ceil(videoDuration / 60);
    throw new Error(`Video is ${durationMins} minutes long. Maximum allowed is 10 minutes.`);
  }
}
```

---

### Task 2: Translate Italian Strings to English

**File: `src/components/YouTubeVideoExercises.tsx`**

Replace all hardcoded Italian strings with English equivalents:

| Current (Italian) | Replace With (English) |
|-------------------|------------------------|
| `"Cosa praticherai:"` | `"What you'll practice:"` |
| `"Vocabolario dal video"` | `"Video vocabulary"` |
| `"Comprensione orale"` | `"Listening comprehension"` |
| `"Grammatica e struttura delle frasi"` | `"Grammar and sentence structure"` |
| `"Esercizi basati sul contesto"` | `"Context-based exercises"` |
| `"Scegli il livello di difficoltà:"` | `"Choose difficulty level:"` |
| `"10 esercizi • Vocabolario base"` | `"10 exercises • Basic vocabulary"` |
| `"10 esercizi • Grammatica complessa"` | `"10 exercises • Complex grammar"` |
| `"10 esercizi • Concetti astratti"` | `"10 exercises • Abstract concepts"` |
| `"Generando..."` | `"Generating..."` |

Also fix error messages (lines 132-193):
| Current (Italian) | Replace With (English) |
|-------------------|------------------------|
| `"Errore"` | `"Error"` |
| `"Nessun transcript disponibile per questo video"` | `"No transcript available for this video"` |
| `"Errore generazione"` | `"Generation error"` |
| `"Impossibile generare esercizi"` | `"Unable to generate exercises"` |
| `"Si è verificato un errore imprevisto"` | `"An unexpected error occurred"` |
| `"Esercizi generati! 🎯"` | `"Exercises generated! 🎯"` |
| `"esercizi creati per il livello"` | `"exercises created for level"` |

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/process-youtube-video/index.ts` | Add duration=0 check to block videos when duration can't be verified |
| `src/components/YouTubeVideoExercises.tsx` | Replace Italian text with English |

---

### Technical Notes

- The edge function log confirms: `Video duration: 0 seconds` - the Supadata API returned 0
- The `SUPADATA_API_KEY` may be missing or the API call failed
- Default UI language should always be English per existing standard
- The translations.ts file exists but doesn't have keys for these specific strings, so we'll use hardcoded English

