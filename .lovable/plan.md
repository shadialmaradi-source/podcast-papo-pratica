

# Browser-Language / UI-Language Stabilization — 5 Files

## Current Issues
- `browserLanguage.ts` includes `'pt'` in auto-detection, causing Portuguese UI for Brazilian users
- `LandingPage.tsx` has its own duplicate `detectBrowserLanguage()` (excludes `pt` but diverges from shared util)
- `Onboarding.tsx` has hardcoded `"Start Lesson"` instead of using a translation key
- `TeacherLanding.tsx` is English-only (no detection logic) — already correct, just needs a comment

## Changes

### 1. `src/utils/browserLanguage.ts`
Remove `'pt'` from the supported auto-detection list. New list: `['en', 'es', 'fr', 'it']`.

### 2. `src/hooks/useTranslation.tsx`
No changes needed — it already calls `detectUILanguage()` which will now exclude Portuguese.

### 3. `src/pages/LandingPage.tsx`
- Import `detectUILanguage` from `@/utils/browserLanguage`
- Delete the local `detectBrowserLanguage` function (lines 170-174)
- Replace usage at line 178 with `detectUILanguage()` (cast to `LandingLanguage` since the landing also supports `'de'` which isn't in LanguageCode — we'll handle this by keeping the local type but using detectUILanguage with a fallback: if result is `'pt'` treat as `'en'`, otherwise use it if it's a valid LandingLanguage)

Actually simpler: since `detectUILanguage` now returns `en|es|fr|it` (no `pt`), and LandingPage supports `en|es|fr|it|de`, we just need to also check for `'de'` in LandingPage. Cleanest approach: replace the local function body to call `detectUILanguage()` first, then also check for `'de'` from browser. This keeps one source of truth for the restricted set while allowing the landing page's extra German support.

### 4. `src/pages/TeacherLanding.tsx`
Already hardcoded English — no language detection present. No code change needed; the plan item is satisfied.

### 5. `src/pages/Onboarding.tsx`
Replace the hardcoded `"Start Lesson"` string at line 293 with `{t('startLesson')}`. Since `startLesson` doesn't exist in translations.ts yet, use `{t('continue')}` instead (which exists and is translated). This is the minimal safe fix.

## Summary

| File | Change |
|------|--------|
| `browserLanguage.ts` | Remove `'pt'` from supported list |
| `useTranslation.tsx` | No change (already correct) |
| `LandingPage.tsx` | Replace local detection with `detectUILanguage()` + German fallback |
| `TeacherLanding.tsx` | No change needed (already English-only) |
| `Onboarding.tsx` | Replace hardcoded "Start Lesson" with `{t('continue')}` |

3 files edited, 0 new files, 0 architecture changes.

