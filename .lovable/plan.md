

# Add "Reset Tour" to Profile + Verify Onboarding UI

## What you see now
The `/app` page looks correct — the two cards are clean, no overlapping tooltips. The onboarding hints were already dismissed for your account (localStorage flags are set to `true`).

## Problem
You can't easily re-test the onboarding because clearing localStorage requires browser dev tools, which aren't accessible in the Lovable preview.

## Plan

### 1. Add "Reset Guided Tour" button to ProfilePage
In `src/components/ProfilePage.tsx`, add a button in the settings section that clears the three localStorage keys (`has_seen_home_hints`, `library_tour_completed`, `transcript_tutorial_completed`) and shows a toast "Tour reset! Navigate to Home to see it again." This lets you (and any user) re-experience the onboarding anytime.

### 2. No other changes needed
The tooltip positioning fixes from the previous implementation are already in place:
- **AppHome hints**: Consolidated banner below the grid (`mt-4`) — confirmed in code
- **LibraryTourTooltip**: Mobile uses `fixed top-4` — confirmed in code
- **TranscriptTutorial**: Top tooltips at `top-16` — confirmed in code  
- **DemoTooltip**: Inline `relative mt-4` — confirmed in code

After adding the Reset Tour button, you can tap it in your profile, go back to `/app`, and visually verify the hints appear below the cards without overlap.

