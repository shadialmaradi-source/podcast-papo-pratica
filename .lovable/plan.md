

# Plan: Expand Native Language Selection to 20 Languages with Compact Mobile Layout

## Problem
Currently only 5 native languages are available. Users need a much broader selection, and the current 2-column card grid with large flags is too bulky for 20 items on mobile.

## Design
Replace the large cards with a **compact list/chip layout** — each language shown as a smaller row or pill with flag + name, fitting ~5 visible at a time without scrolling, or a scrollable compact grid. Specifically:

- **3-column grid on mobile, 4 on desktop** with small compact cards (flag + name only, no subtitle)
- Much smaller padding and font sizes than current cards
- ScrollArea wrapper with max height so the list doesn't push buttons off-screen

## Languages (20)
English, Spanish, French, Italian, Portuguese, German, Chinese, Japanese, Korean, Arabic, Hindi, Russian, Dutch, Turkish, Polish, Swedish, Norwegian, Danish, Greek, Thai

## Changes

### `src/pages/Onboarding.tsx`
1. Expand `nativeLanguages` array to 20 entries with code, name, flag, native name
2. Replace the native language step's 2-column Card grid with a **3-col compact grid** using small clickable cells (flag + name, ~48px tall)
3. Wrap in a `max-h-[50vh] overflow-y-auto` container so buttons stay visible on mobile
4. Update `targetToNativeCode` mapping to include new languages (german→de, chinese→zh, etc.)

### `src/utils/translations.ts`
- Expand `LanguageCode` type to include new codes (de, zh, ja, ko, ar, hi, ru, nl, tr, pl, sv, no, da, el, th)
- No need to add full translation sets for all — these are native language codes for hint display, the UI translations can remain en/es/fr/it/pt

