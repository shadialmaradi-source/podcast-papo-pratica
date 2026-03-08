

# Plan: Add Quick Review Button to Home Page

## Overview
Add a compact "Review Flashcards" button below the two main cards on the home page. When tapped, it opens a streamlined review session of 10 flashcards at a time (flip-card style), with a "Continue?" prompt after each batch. When the user runs out of cards, show a message with a button to go to a recommended video.

## Changes

### 1. `src/pages/AppHome.tsx`
- Fetch flashcard count on load (using `getFlashcardCount` already imported in ProfilePage)
- Add a compact review card/button below the two main cards (smaller, secondary styling — not competing with Library/Import)
- Show the count: e.g., "Review 31 flashcards"
- Only show when count > 0
- On click, navigate to a new state/view that starts the review flow

### 2. New component: `src/components/QuickReviewSession.tsx`
- Full-screen review experience (reuses `LessonFlashcards`)
- On mount: fetch user's flashcards from `user_viewed_flashcards` (same query as FlashcardRepository) filtered by user's `selected_language`
- If user has cards in multiple languages, show a quick language picker first
- Shuffle all cards, take first 10 as a batch
- Pass batch to `LessonFlashcards` with `onComplete` and `onExit`
- **On complete (batch of 10 done)**:
  - If more cards remain: show "Want to continue?" dialog with Yes (load next 10) / No (go back home)
  - If no more cards: show "You've reviewed all your flashcards! Save more from videos" message with a "Find a Video" button
- **"Find a Video" button**: uses the same similarity recommendation logic from `Lesson.tsx` (query community videos matching user's language, preferred category/length) and navigates to `/lesson/{videoId}`
- **Exit button**: returns to home (`onExit` navigates back)

### 3. `src/pages/AppHome.tsx` — state management
- Add `showQuickReview` boolean state
- When true, render `<QuickReviewSession>` full-screen instead of the home content
- Pass `onClose` to return to home

### Files to create/modify:
- **Create**: `src/components/QuickReviewSession.tsx`
- **Modify**: `src/pages/AppHome.tsx` — add review button + toggle to QuickReviewSession

