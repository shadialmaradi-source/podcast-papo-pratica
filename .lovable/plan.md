

# Plan: Add "Add Your Video" Card to Community Tab

## What
In the Library page's Community tab, insert a persistent "Add Your Video" card as the first item in the video grid. Clicking it opens the same import dialog used on `/app`. This card appears before the Featured row and always stays visible regardless of filters.

## How

### 1. Add import dialog state and logic to `Library.tsx`
Copy the import video dialog + handler logic from `AppHome.tsx` into `Library.tsx`:
- State: `importDialogOpen`, `videoUrl`, `importing`, `uploadQuota`, `showUpgradePrompt`, `upgradeReason`
- `fetchUploadQuota()` on mount
- `handleImportVideo()` function (same as AppHome)
- The Dialog + UpgradePrompt components at the bottom

### 2. Add an "Add Video" CTA card before the community videos
Before the `FeaturedRow`, render a styled card with a `+` icon, title like "Add Your YouTube Video", and subtitle "Paste a link and start practicing". Clicking it opens the import dialog. Style it similarly to `VideoCard` so it fits the grid.

### 3. Also prepend it in the "All Videos" grid
If there are remaining videos shown in the grid below Featured, also prepend the same CTA card as the first grid item so it's always accessible.

## Files changed
- **`src/pages/Library.tsx`**: Add import dialog state/logic, render CTA card in community tab, render Dialog and UpgradePrompt components

