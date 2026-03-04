

# Plan: Add First-Visit Onboarding Hints to AppHome

## What
Show animated tooltip hints on the AppHome page for first-time users, explaining what each card does. The hints appear once and are dismissed by clicking either card.

## How

### 1. Track first visit with localStorage
Use a `has_seen_home_hints` key in localStorage. If absent, show the hints overlay. Set it when the user interacts with either card.

### 2. Add hint tooltips to both cards
When hints are active, render small speech-bubble-style labels below/above each card:

- **Learn from Library card**: "Follow a structured learning path with videos curated by ListenFlow and the community"
- **Your Own Video card**: "Paste any YouTube link to create a personalized lesson from your own video"

Each hint will be a small animated badge/callout with a pulsing dot or subtle bounce animation using framer-motion. A semi-transparent overlay or subtle highlight draws attention.

### 3. Auto-dismiss behavior
- Clicking either card dismisses hints and sets `has_seen_home_hints = true`
- A small "Got it" dismiss button also available

## Files changed
- **`src/pages/AppHome.tsx`**: Add `showHints` state (driven by localStorage), render hint callouts beneath each card with framer-motion animations, dismiss on card click

No database changes needed.

