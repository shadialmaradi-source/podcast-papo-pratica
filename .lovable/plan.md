

# Fix: Word Explorer in Inline Results + Verify Share Link

## Bug
In `CreateLessonForm.tsx`, when `createdLessonId` is set, the component returns early (line 318-446). The `TextSelectionPopover`, `WordExplorerPanel`, and `FlashcardCreatorModal` are rendered after line 699 — outside the early return. So text selection features don't work in the inline result paragraph.

## Fix

### `src/components/teacher/CreateLessonForm.tsx`
Move the three overlay components (`TextSelectionPopover`, `WordExplorerPanel`, `FlashcardCreatorModal`) into the inline result view as well. Wrap the early-return block in a fragment that includes these components, so word exploration works on the paragraph tab after lesson creation.

Specifically:
- Wrap the `createdLessonId` return block (lines 319-446) in a `<>...</>` fragment
- Add the same three components (`TextSelectionPopover`, `WordExplorerPanel`, `FlashcardCreatorModal`) inside that fragment, identical to lines 699-736

This is a single-file change of ~40 lines.

