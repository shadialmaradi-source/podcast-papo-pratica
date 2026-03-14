

# Apply Patch: Language Normalization in YouTubeSpeaking + languageUtils

The patch targets two files. The `languageUtils.ts` change applies cleanly. The `YouTubeSpeaking.tsx` patch references code from a prior unapplied change (`finalLanguage`, `sceneTranscriptProp`), so I'll apply the **same intent** — normalize the language value — against the **actual current code**.

## File 1: `src/utils/languageUtils.ts`

Lines 67-76 — add `base` extraction and fallback lookup:

```typescript
const lower = code.toLowerCase().trim();
const base = lower.split('-')[0].split('_')[0];   // NEW
const isoMap = { ... };
if (isoMap[lower]) return isoMap[lower];
if (isoMap[base]) return isoMap[base];             // NEW
```

## File 2: `src/components/YouTubeSpeaking.tsx`

**Line 9** — add `normalizeLanguageCode` to import.

**Lines 170-171** — normalize before setting state:
```typescript
const normalizedLanguage = normalizeLanguageCode(transcriptData.language || "english");
setTranscript(transcriptData.transcript);
setLanguage(normalizedLanguage);
```

**Line 181** — use normalized value in edge function call:
```typescript
language: normalizedLanguage,
```

This requires hoisting the variable so it's accessible at both sites (lines 170 and 181). A `const normalizedLanguage` declared at line 170 is in scope for line 181 since both are inside the same `try` block.

## Summary

| File | Change |
|------|--------|
| `src/utils/languageUtils.ts` | Add `base` locale stripping + fallback |
| `src/components/YouTubeSpeaking.tsx` | Import normalizer, use it on transcript language before setState and edge function call |

