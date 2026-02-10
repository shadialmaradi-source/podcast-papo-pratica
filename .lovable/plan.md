

# Improve Transcript Feature Discoverability

## Problem

The transcript's interactive features (text selection for flashcards, AI-suggested words, word explorer) are hard to discover. The current hint is a tiny line of grey text that's easy to miss, especially on mobile. Users don't realize they can tap/click words or select text. The dashed-underline suggestions exist but there's no onboarding moment that draws attention to them.

## Changes

### 1. Add an Onboarding Tooltip on First Visit

Show a one-time animated tooltip/banner that appears when the transcript first loads, pointing at the first suggested word. It dismisses after the user interacts or after 5 seconds. Uses `localStorage` to track if the user has seen it (`transcript_onboarding_seen`).

**Content**: "Tap any underlined word to save it as a flashcard, or select text to explore vocabulary!"

This will be a floating callout with an arrow pointing at the first dashed-underlined word in the transcript, using `framer-motion` for a gentle pulse/bounce animation.

### 2. Make the Hint Banner More Prominent

Replace the current tiny grey hint text with a visually distinct, dismissible info banner:
- Uses a colored background (e.g., `bg-primary/10`) with an icon
- Text: "Tap underlined words to save flashcards -- or select any text to explore"
- Dismiss "x" button that hides it for the session
- On mobile: slightly larger text for readability

### 3. Ensure Suggested Words Appear on Early Segments

Currently, suggestions are distributed across the transcript. Prioritize placing at least 2-3 suggestions in the **first 3 visible segments** so users immediately see interactive underlined words when the transcript loads. This is a change to the `suggest-transcript-words` edge function prompt -- add an instruction to include at least 2 suggestions from the first 3 segments.

### 4. Mobile Touch Improvements

The `TextSelectionPopover` positioning can be problematic on mobile (too close to edge, obscured by keyboard). Improvements:
- Add bottom-sheet style popover on mobile (detected via `useIsMobile`) instead of floating above the selection
- Increase tap target size for suggested words on mobile (larger padding)
- On mobile, tapping a suggested word should show the popover near the bottom of the screen for easier thumb access

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/components/transcript/TranscriptViewer.tsx` | Replace grey hint with prominent dismissible banner; add onboarding tooltip state and rendering; pass `isFirstVisit` context |
| `src/components/transcript/TranscriptLine.tsx` | Increase tap target padding for suggested words on mobile (`py-1 px-1` instead of `px-0.5`) |
| `src/components/transcript/TextSelectionPopover.tsx` | Add mobile-aware positioning: use bottom-anchored sheet on small screens via `useIsMobile` |
| `supabase/functions/suggest-transcript-words/index.ts` | Add prompt instruction: "Include at least 2 suggestions from the first 3 transcript segments" |

### Onboarding Tooltip Logic (TranscriptViewer)

```text
On mount:
  1. Check localStorage for 'transcript_onboarding_seen'
  2. If not seen AND suggestedWords loaded AND suggestedWords.length > 0:
     - Show animated banner with pulse effect
     - After user clicks a suggested word OR after 8 seconds, dismiss and set localStorage
  3. If already seen: show the standard (but improved) hint banner
```

### Improved Hint Banner (replaces line 291-298)

A styled div with:
- `bg-primary/10 border border-primary/20 rounded-lg p-3` styling
- Sparkles icon + descriptive text
- On mobile: text wraps nicely with `text-sm`
- Dismissible with an X button (hides for the session via state)
- When suggestions are loaded, the text includes: "Try tapping an underlined word below!"

### Mobile Popover (TextSelectionPopover)

On mobile (`useIsMobile()`):
- Render as a fixed bar at the bottom of the screen instead of floating near the selection
- Full-width with larger buttons for easy tapping
- Slide-up animation via framer-motion

On desktop:
- Keep current floating behavior (no change)

### Edge Function Prompt Update

Add to the system prompt in `suggest-transcript-words/index.ts`:
"IMPORTANT: Include at least 2 of your suggestions from the first 3 transcript segments (the beginning of the transcript), so users immediately see interactive vocabulary when they start reading."

