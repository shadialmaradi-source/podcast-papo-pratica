

# Plan: Remove "0:00" Timestamp from Transcript

## Problem
The transcript currently shows a "0:00" timestamp badge because there's no per-line timing data. This wastes horizontal space and looks odd.

## Solution
In `TranscriptLine.tsx`, conditionally hide the `<Badge>` when the timestamp is "0:00" (no real timing data), and let the text fill the full width.

### `src/components/transcript/TranscriptLine.tsx`
- Only render the Badge when `timeSeconds > 0` or `timestamp !== '0:00'` (i.e., there's meaningful timing data).
- When hidden, remove the `gap-3` from the flex container so text spans full width.

### Files to modify:
- `src/components/transcript/TranscriptLine.tsx`

