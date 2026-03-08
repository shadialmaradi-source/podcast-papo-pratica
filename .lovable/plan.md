

# Plan: Mobile-Friendly Overhaul Across All Sections

## Sections to Fix

After mapping the entire onboarding flow and key pages, here are the components that need mobile optimization. The core pattern across all of them is the same: reduce padding, tighten spacing, use `min-h-[100dvh]` instead of `min-h-screen` (to account for mobile browser chrome), and ensure CTAs are always visible without scrolling.

### 1. Onboarding (`src/pages/Onboarding.tsx`)
- Language/native cards: reduce `p-6` to `p-4` on mobile, reduce `text-4xl` flag to `text-3xl`, reduce `mb-8` gaps to `mb-4`
- Level cards: already compact, but reduce outer spacing
- CTA buttons (`py-6 text-lg`): reduce to `py-4 text-base` on mobile
- Use `min-h-[100dvh]` and make the main area use `flex-1 overflow-auto` with the CTA pinned at the bottom via `sticky bottom-0`

### 2. LessonIntro (`src/components/lesson/LessonIntro.tsx`)
- Reduce the icon size from `w-20 h-20` to `w-14 h-14` on mobile
- Reduce `space-y-8` to `space-y-4` on mobile
- Reduce card padding from `p-6 md:p-8` to `p-4 md:p-8`
- Make "Start Lesson" button sticky at bottom on mobile
- Use `min-h-[100dvh]`

### 3. LessonVideoPlayer (`src/components/lesson/LessonVideoPlayer.tsx`)
- Reduce `space-y-6` to `space-y-3` on mobile
- Make "Continue to Exercises" button sticky at bottom
- Reduce tip box padding on mobile
- Use `min-h-[100dvh]`

### 4. LessonExercises (`src/components/lesson/LessonExercises.tsx`)
- Navigation buttons (Previous/Next): make them sticky at bottom on mobile
- Reduce card padding `p-6 md:p-8` to `p-4 md:p-8`
- Results screen: reduce icon size and padding on mobile
- Use `min-h-[100dvh]`

### 5. LessonSpeaking (`src/components/lesson/LessonSpeaking.tsx`)
- Summary mode: reduce card padding, make "Try Again / Continue" buttons sticky at bottom
- Phrase mode: reduce recording button from `w-24 h-24` to `w-20 h-20` on mobile, make "Continue to Flashcards" sticky
- Timer text: reduce from `text-5xl` to `text-4xl` on mobile
- Use `min-h-[100dvh]`

### 6. LessonFlashcards (`src/components/lesson/LessonFlashcards.tsx`)
- Reduce flashcard `min-h-[300px]` to `min-h-[220px]` on mobile
- Reduce card padding from `p-8` to `p-5` on mobile
- Make "Complete Lesson" / navigation buttons sticky at bottom
- Use `min-h-[100dvh]`

### 7. LessonComplete (`src/components/lesson/LessonComplete.tsx`)
- Reduce trophy icon from `w-24 h-24` to `w-16 h-16` on mobile
- Tighten spacing between stats
- Make CTA sticky at bottom
- Use `min-h-[100dvh]`

### 8. LessonCompleteScreen (`src/components/lesson/LessonCompleteScreen.tsx`)
- Same pattern: tighten spacing, sticky CTA

### 9. StudentLesson (`src/pages/StudentLesson.tsx`)
- Ensure exercise cards and generate buttons are well-spaced on mobile
- Video embed aspect ratio works but spacing around it needs tightening

### 10. LandingPage (`src/pages/LandingPage.tsx`)
- Hero section: ensure CTA visible without scroll on mobile

## Implementation Approach

The consistent pattern for each component:
1. Replace `min-h-screen` with `min-h-[100dvh]`
2. Use a flex column layout: scrollable content area + sticky bottom CTA
3. Reduce padding/spacing with responsive classes (`p-3 md:p-6`, `space-y-3 md:space-y-6`)
4. Reduce icon/font sizes on mobile (`w-14 h-14 md:w-20 md:h-20`, `text-2xl md:text-3xl`)

For the sticky CTA pattern, wrap each page in:
```
<div className="min-h-[100dvh] flex flex-col">
  <div className="flex-1 overflow-auto p-3 md:p-8">
    {/* content */}
  </div>
  <div className="sticky bottom-0 p-3 md:p-6 bg-background/80 backdrop-blur border-t md:border-0">
    <Button ...>CTA</Button>
  </div>
</div>
```

## Files to Edit (10 files)

1. `src/pages/Onboarding.tsx`
2. `src/components/lesson/LessonIntro.tsx`
3. `src/components/lesson/LessonVideoPlayer.tsx`
4. `src/components/lesson/LessonExercises.tsx`
5. `src/components/lesson/LessonSpeaking.tsx`
6. `src/components/lesson/LessonFlashcards.tsx`
7. `src/components/lesson/LessonComplete.tsx`
8. `src/components/lesson/LessonCompleteScreen.tsx`
9. `src/pages/StudentLesson.tsx`
10. `src/pages/LandingPage.tsx`

