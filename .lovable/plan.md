

# 5-File Minimal Bug-Fix Plan

## Fix 1: Speaking timer — `src/components/YouTubeSpeaking.tsx`

**Line 378** — Remove `isAuthenticated` check:
```
const maxDuration = isSummaryMode ? 30000 : 5000;
```

**Line 600** — Hardcode "30 seconds":
```
Summarize what you learned from the video in 30 seconds.
```

## Fix 2: Exercise language — `src/hooks/useYouTubeExercises.ts`

**Line 7** — Add import:
```typescript
import { normalizeLanguageCode } from "@/utils/languageUtils";
```

**Lines 220-224** — After `setDbVideoId`, fetch video language:
```typescript
if (videoData) {
  setDbVideoId(videoData.id);
  const dbDifficulty = mapLevelToDbDifficulty(level);

  let videoLanguage = 'english';
  const { data: transcriptMeta } = await supabase
    .from('youtube_transcripts')
    .select('language')
    .eq('video_id', videoData.id)
    .maybeSingle();
  if (transcriptMeta?.language) {
    videoLanguage = normalizeLanguageCode(transcriptMeta.language);
  }

  const fetchExercises = async (sceneIdParam: string | null) => {
```

**Lines 236-240** — Add `language` to body:
```typescript
const body: any = {
  videoId: videoData!.id,
  level: dbDifficulty,
  nativeLanguage: userNativeLanguage,
  language: videoLanguage,
};
```

## Fix 3: VideoFlashcards — `src/components/VideoFlashcards.tsx`

**Line 8** — Add import:
```typescript
import { normalizeLanguageCode } from "@/utils/languageUtils";
```

**Lines 65-68** — Normalize native language:
```typescript
if (profile?.native_language) {
  userNativeLanguage = profile.native_language;
}
userNativeLanguage = normalizeLanguageCode(userNativeLanguage);
setNativeLanguage(userNativeLanguage);
```

**Line 75** — Normalize learning language in edge call:
```typescript
language: normalizeLanguageCode(transcriptData.language || 'portuguese'),
```

**Line 88** — Normalize before setState:
```typescript
setLanguage(normalizeLanguageCode(transcriptData.language || 'english'));
```

## Fix 4: LessonFlashcards — `src/components/lesson/LessonFlashcards.tsx`

**Line 6** — Extend import:
```typescript
import { getLanguageFlag, normalizeLanguageCode } from "@/utils/languageUtils";
```

**Lines 37-38** — Add normalization:
```typescript
const LessonFlashcards = ({ flashcards, onComplete, onExit, language = "english", nativeLanguage = "en" }: LessonFlashcardsProps) => {
  const normalizedLang = normalizeLanguageCode(language);
  const normalizedNative = normalizeLanguageCode(nativeLanguage);
  const [currentIndex, setCurrentIndex] = useState(0);
```

**Line 156** — Use `normalizedLang`:
```typescript
{getLanguageFlag(currentCard.cardLanguage || normalizedLang)}
```

**Lines 174, 177, 182** — Use `normalizedNative`:
```typescript
{getNativeLanguageFlag(normalizedNative)}
{getLocalizedText(currentCard.translation, normalizedNative)}
{getLocalizedText(currentCard.why, normalizedNative)}
```

## Fix 5: Edge function — `supabase/functions/generate-flashcards/index.ts`

**Before line 23 (before `serve`)** — Add helper:
```typescript
function normalizeLanguage(code: string | null | undefined): string {
  if (!code) return 'english';
  const lower = code.toLowerCase().trim();
  const base = lower.split('-')[0].split('_')[0];
  const isoMap: Record<string, string> = {
    en: 'english', it: 'italian', es: 'spanish',
    pt: 'portuguese', fr: 'french', de: 'german',
  };
  if (isoMap[lower]) return isoMap[lower];
  if (isoMap[base]) return isoMap[base];
  const canonical = ['english','italian','spanish','portuguese','french','german'];
  if (canonical.includes(lower)) return lower;
  return 'english';
}
```

**Line 68** — Normalize:
```typescript
const effectiveNativeLang = normalizeLanguage(nativeLanguage || 'en');
```

**Lines 100-101** — Normalize:
```typescript
const targetLanguage = normalizeLanguage(language || 'portuguese');
const translationLanguage = normalizeLanguage(nativeLanguage || 'english');
```

---

5 files, 0 new files, 0 architecture changes. All existing defaults preserved.

