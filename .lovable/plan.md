

# Fix Duplicate Paragraph, Add Length Selector, and Improve Share Link

## Issues Identified

1. **Duplicate paragraph**: The generated paragraph is shown twice -- once as a read-only `div` (for text selection) and again as an editable `Textarea` below it. Remove the `Textarea` and make the `div` the only display, with a small "Edit" toggle if the teacher wants to tweak the text.

2. **Missing paragraph length option**: Add a "Paragraph Length" selector (Short / Medium / Long) between Language and the Generate button. Pass this to the edge function to adjust word count.

3. **Text selection popover already works**: The code already has `useTextSelection`, `TextSelectionPopover`, `WordExplorerPanel`, and `FlashcardCreatorModal` integrated. If it's not appearing, it may be a z-index or event issue -- will verify and fix.

4. **Share link after creation**: The share link card already exists (lines 508-518) but only shows after successful creation. This is correct behavior -- will ensure it's prominent and visible.

## Changes

### 1. `CreateLessonForm.tsx`
- **Remove duplicate Textarea** (lines 359-365) -- keep only the interactive `div` with `ref={paragraphRef}` for text selection
- **Add paragraph length selector** with options: Short (~50-80 words), Medium (~80-150 words), Long (~150-250 words) as a radio group or Select, placed after Language and before Generate
- **Add `paragraph_length` to form schema** with default "medium"
- **Pass `paragraphLength` to the edge function** in `handleGenerateParagraph`

### 2. `generate-lesson-paragraph/index.ts`
- Accept `paragraphLength` parameter
- Adjust word count range in the system prompt based on length:
  - short: 50-80 words
  - medium: 80-150 words
  - long: 150-250 words

### 3. Verify text selection popover works
- The components are already wired up (lines 522-562). If the popover isn't appearing on the generated paragraph, it may be because the `paragraphRef` div needs `user-select: text` and proper positioning context. Will ensure the card has `position: relative` for correct popover placement.

