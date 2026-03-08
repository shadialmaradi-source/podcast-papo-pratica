

# Plan: Unify Homepage "Review Flashcards" with Profile Flashcard Repository

## Problem

The homepage "Review Flashcards" button launches `QuickReviewSession`, which auto-starts studying all cards for the user's `selected_language` without showing a language picker or filter options. The Profile's Flashcard Repository shows a language selector, video filter, and studies in batches of 10. These should be identical experiences.

## Solution

Replace `QuickReviewSession` usage on the homepage with `FlashcardRepository` — the same component used from the Profile page. This gives homepage users the same flow: language picker (if multi-language), filter by video/mastery, and batch study sessions.

## Changes

| File | Change |
|------|--------|
| `src/pages/AppHome.tsx` | Replace `QuickReviewSession` import and rendering with `FlashcardRepository`. Pass `userId` and `onClose` (same props). Remove the `QuickReviewSession` import. |

The `FlashcardRepository` already accepts `{ userId, onClose }` which matches what's needed. The `onClose` callback in AppHome (`() => setShowQuickReview(false)`) works as-is — just rename the state variable for clarity if desired.

`QuickReviewSession.tsx` can be kept or removed later — it becomes unused.

## What Changes for the User

- Clicking "Review Flashcards" on homepage now opens the full Flashcard Repository screen
- Language selector appears when cards exist in multiple languages
- Filter by video or mastery status before starting
- Study sessions use the same batch-of-10 flip-card flow via `LessonFlashcards`

