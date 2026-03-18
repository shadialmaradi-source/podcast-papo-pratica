

# Speaking Efficiency Patch — 1 File

## `src/components/YouTubeSpeaking.tsx`

**Problem**: Every time the speaking component mounts (including revisits within the same lesson session), it re-invokes `extract-speaking-phrases` for beginner mode, even if the same video/scene/level was already resolved.

**Fix**: Add a module-level `Map<string, SpeakingPhrase[]>` cache keyed by `${videoId}::${sceneId || 'full'}::${level}`. Before calling the edge function, check the cache. After a successful response, store the result.

### Changes (lines 56–191):

**After line 55** — add cache + key builder:

```typescript
const phrasesCache = new Map<string, SpeakingPhrase[]>();

function buildPhrasesCacheKey(videoId: string, level: string, sceneId?: string): string {
  return `${videoId}::${sceneId || 'full'}::${level}`;
}
```

**Lines 170–191** — wrap the edge function call with a cache check:

```typescript
if (!isSummaryMode) {
  const cacheKey = buildPhrasesCacheKey(videoId, level, sceneId);
  const cached = phrasesCache.get(cacheKey);

  if (cached) {
    setPhrases(cached);
  } else {
    const { data: phraseData, error: phraseError } = await supabase.functions.invoke(
      'extract-speaking-phrases',
      {
        body: {
          transcript: actualTranscript,
          level,
          language: normalizedLanguage,
        },
      }
    );

    if (phraseError) {
      const serverMsg =
        (phraseError as any)?.context?.json?.error ||
        (phraseError as any)?.context?.body?.error ||
        (phraseError as any)?.message;
      throw new Error(serverMsg || 'Failed to extract phrases');
    }

    const extractedPhrases = (phraseData as any)?.phrases || [];
    phrasesCache.set(cacheKey, extractedPhrases);
    setPhrases(extractedPhrases);
  }
}
```

## Summary

| File | Change |
|------|--------|
| `src/components/YouTubeSpeaking.tsx` | Module-level Map cache for extracted phrases; check before invoking edge function |

1 file, ~10 lines added. Same outputs, same scoring, fewer redundant edge calls.

