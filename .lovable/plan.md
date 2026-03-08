

# Plan: Guided Transcript Tutorial for First-Time Users

## Overview

Create a multi-step guided onboarding tutorial that teaches users how to use the transcript, word explorer, and flashcard features. The tutorial triggers once (first visit to any video lesson page), programmatically pauses the video at ~20s, and walks users through each feature with tooltip overlays and forced interactions (skippable after 3s).

## Changes to Free User Transcript Access

**Current**: Free users see 2 sentences + full lock screen (LockedTranscript component).
**New**: Free users always see first 2 transcript sentences with explore/flashcard functionality enabled on those 2 sentences. The rest remains locked with upgrade CTA. During the first-time tutorial only, the full transcript is temporarily accessible.

## Tutorial Flow (7 Steps)

1. **Video pauses at ~20s** -- Overlay popup: "Now scroll down to the transcript!" with animated arrow pointing down. User clicks "Go to Transcript" to continue.
2. **Scroll to transcript** -- Auto-scroll to transcript section. A sentence is pre-highlighted based on user's level (beginner = simpler sentence, advanced = complex). Tooltip: "Tap this highlighted word to explore it!"
3. **Force explore** -- The highlighted word is pre-selected, showing the TextSelectionPopover. User must click "Explore" (or skip after 3s).
4. **Word Explorer opens** -- WordExplorerPanel opens with the analysis. Tooltip overlay: "This is the Word Explorer! See translations, conjugations, and more." User reads it, then tooltip: "Now save it as a flashcard!" pointing at the "Save as Flashcard" button.
5. **Save flashcard from explorer** -- User clicks "Save as Flashcard" (or skips). FlashcardCreatorModal opens.
6. **Flashcard modal** -- Tooltip: "Review and save your flashcard!" User saves or closes.
7. **Return to video** -- Popup: "Great! Now continue watching the video." Video resumes.

## Technical Approach

### New Component: `TranscriptTutorial.tsx`
A state-machine component managing the 7 tutorial steps. Renders tooltip overlays positioned relative to target elements using refs/IDs. Uses `localStorage` key `transcript_tutorial_completed` to track completion.

Each step renders:
- A semi-transparent backdrop
- A tooltip/popup pointing at the relevant UI element
- A "Skip" link that appears after 3 seconds
- Step-specific action buttons

### Modified Files

1. **`TranscriptViewer.tsx`**:
   - Accept new prop `tutorialActive: boolean` and `tutorialStep` to control which sentence is highlighted and whether explore is forced
   - When tutorial is active + user is free: show ALL segments (not just 2), but revert to 2 after tutorial completes
   - Expose refs for key elements (transcript container, suggested word) via callback props

2. **`YouTubeVideoExercises.tsx`** (the lesson video page):
   - Add tutorial state machine
   - Use YouTube IFrame API (`postMessage`) to pause video at ~20s
   - Mount `TranscriptTutorial` overlay component
   - Pass tutorial props down to `TranscriptViewer`

3. **`LockedTranscript.tsx`**:
   - No longer rendered during tutorial for free users
   - After tutorial: show 2 functional sentences + locked rest (modify TranscriptViewer to render 2 interactive lines + LockedTranscript for the rest)

4. **`WordExplorerPanel.tsx`**:
   - Add optional `tutorialHighlight` prop to show tooltip overlay on the "Save as Flashcard" button

### Video Pause Implementation

In `YouTubeVideoExercises.tsx`, switch from a plain `<iframe>` to the YouTube IFrame Player API (similar to `LessonVideoPlayer.tsx`). This allows:
- Monitoring `getCurrentTime()` via polling
- Calling `player.pauseVideo()` at ~20s
- Calling `player.playVideo()` when tutorial ends

### localStorage Keys
- `transcript_tutorial_completed`: marks tutorial as done (never show again)
- Existing `transcript_onboarding_seen`: the simpler tip banner (keep as-is for premium users)

### Free User Transcript Logic (post-tutorial)

Change the `if (!isPremium)` check in `TranscriptViewer` from rendering `LockedTranscript` to:
- Render the first 2 segments with full interactivity (explore + flashcard)
- Below them, render a condensed lock/upgrade CTA
- Suggested words only loaded for those 2 segments

## Files to Create
- `src/components/transcript/TranscriptTutorial.tsx` -- tutorial overlay component

## Files to Edit
- `src/components/YouTubeVideoExercises.tsx` -- add YT API player, tutorial state, pause at 20s
- `src/components/transcript/TranscriptViewer.tsx` -- free user 2-sentence access, tutorial props
- `src/components/transcript/WordExplorerPanel.tsx` -- tutorial highlight prop
- `src/components/transcript/LockedTranscript.tsx` -- minor: used as inline CTA after 2 sentences

