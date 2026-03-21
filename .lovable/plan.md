

# Teacher YouTube/Community Builder Stabilization — 5 Files

## Overview
When a teacher selects a community video, only the URL string passes through. This means the form defaults to `language: "italian"`, `cefr_level: "A1"`, empty title/topic — even when the video has that metadata. We fix this by passing structured metadata from the browser, persisting it in session state, and prefilling the form.

## Changes

### 1. `src/components/teacher/CommunityVideoBrowser.tsx`
- **Structured callback**: Change `onSelectVideo` signature from `(url, title)` to a metadata object: `{ url, title, language, difficultyLevel, isShort }`.
- **Duration filter**: Add a `selectedDuration` state with options: `all`, `short`, `long`. Apply `.eq("is_short", true/false)` to the query.
- **Fallback topic chip**: Pass `isShort` to VideoCard via a computed `topics` prop — when no topics exist, show `["Short"]` or `["Long-form"]` based on `is_short`.

### 2. `src/pages/TeacherDashboard.tsx`
- **Structured state**: Replace `prefillYoutubeUrl: string | null` with `communityVideo: { url, title, language, difficultyLevel, isShort } | null`.
- **`handleCommunityVideoSelected`**: Accept the structured object, store it in state and sessionStorage.
- **Pass to CreateLessonForm**: Forward the full `communityVideo` metadata object as a new prop (alongside or replacing `prefillYoutubeUrl`).

### 3. `src/components/teacher/CreateLessonForm.tsx`
- **New prop**: Accept optional `prefillMeta?: { url, title, language, difficultyLevel, isShort }` in addition to existing `prefillYoutubeUrl`.
- **Forward to hook**: Pass `prefillMeta` into `useCreateLesson`.

### 4. `src/hooks/useCreateLesson.ts`
- **Accept `prefillMeta`** in `UseCreateLessonOptions`.
- **Auto-prefill defaults**: When `prefillMeta` is provided, set `youtube_url`, `title`, `language`, `cefr_level` (map `difficultyLevel` → CEFR: beginner→A1, intermediate→B1, advanced→C1), and `topic` from the metadata.
- **Translation-language safety**: If computed source language equals `translation_language` default, pick a safe fallback (e.g., if source is `"english"`, default translation to `"spanish"` instead of `"english"`).

### 5. `src/components/teacher/VideoBrowserModal.tsx`
- Update `handleSelectVideo` to consume the new structured payload shape from `CommunityVideoBrowser` (destructure object instead of positional `(url, title)` args).

## Detailed interface

```typescript
// Shared type
export interface CommunityVideoSelection {
  url: string;
  title: string;
  language: string;
  difficultyLevel: string;
  isShort: boolean;
}
```

## Difficulty → CEFR mapping
```typescript
const DIFFICULTY_TO_CEFR: Record<string, string> = {
  beginner: "A1",
  intermediate: "B1",
  advanced: "C1",
};
```

## Translation-language safety logic
```typescript
const sourceLang = prefillMeta?.language || "italian";
const defaultTranslation = sourceLang === "english" ? "spanish" : "english";
```

## Summary

| File | Change |
|------|--------|
| `CommunityVideoBrowser.tsx` | Structured callback, duration filter, fallback topic chip |
| `TeacherDashboard.tsx` | Structured community video state, session persistence, pass metadata |
| `CreateLessonForm.tsx` | Accept and forward `prefillMeta` prop |
| `useCreateLesson.ts` | Prefill form defaults from metadata, translation-language safety |
| `VideoBrowserModal.tsx` | Consume structured payload |

5 files, ~60 lines changed. No architectural changes.

