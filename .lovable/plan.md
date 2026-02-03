
# Flashcard PDF Download Feature

## Summary
Add a premium-only feature to download flashcards as a beautifully formatted, printable PDF from the Profile page's Flashcards section.

---

## Architecture Overview

```text
+-------------------+     +------------------+     +-------------------+
|   ProfilePage     | --> | FlashcardPDF     | --> | PDFDocument       |
|   (Download Btn)  |     | Generator        |     | (jsPDF)           |
+-------------------+     +------------------+     +-------------------+
         |                        |
         v                        v
+-------------------+     +------------------+
| UpgradePrompt     |     | flashcardService |
| (Free users)      |     | (Fetch data)     |
+-------------------+     +------------------+
```

---

## Components to Create/Modify

### 1. New Files

**`src/services/pdfGeneratorService.ts`**
- Handles PDF generation using jsPDF library
- Creates cover page with user info
- Generates flashcard pages (fronts and backs)
- Applies app branding and styling

**`src/components/subscription/PdfDownloadButton.tsx`**
- Reusable button component with premium lock state
- Shows loading spinner during generation
- Handles premium vs free user logic

### 2. Modified Files

**`src/components/ProfilePage.tsx`**
- Add Download PDF button in Flashcards section (lines 624-631)
- Import new PdfDownloadButton component
- Pass subscription state and flashcard count

**`src/services/flashcardService.ts`**
- Add new function to fetch all flashcard data for PDF export
- Include video title for "source" field

### 3. Dependencies

**Package to Install: `jspdf`**
- Client-side PDF generation library
- Lightweight and well-supported
- No backend required

---

## Implementation Details

### Phase 1: Install jsPDF

Add to package.json:
```json
"jspdf": "^2.5.1"
```

### Phase 2: PDF Generator Service

Create `src/services/pdfGeneratorService.ts`:

**Functions:**
- `generateFlashcardPDF(flashcards, userInfo)` - Main entry point
- `createCoverPage(doc, userInfo, cardCount)` - Title page with branding
- `createFlashcardFronts(doc, flashcards)` - Word/phrase cards
- `createFlashcardBacks(doc, flashcards)` - Translation + context cards
- `downloadPDF(doc, filename)` - Trigger browser download

**PDF Layout:**
- A4 paper size (210mm x 297mm)
- 6 cards per page (2 columns x 3 rows)
- Card size: ~90mm x 75mm
- Cut lines between cards (optional)
- App colors: Primary green (#22c55e)

**Cover Page Content:**
```text
┌────────────────────────────────┐
│                                │
│       📚 My Flashcards         │
│                                │
│    Created for: username       │
│    Language: Portuguese        │
│    Total cards: 47             │
│                                │
│    Generated: February 3, 2026 │
│                                │
│       ListenFlow               │
└────────────────────────────────┘
```

**Card Front Design:**
```text
┌─────────────────┐
│                 │
│   ESCOVAR       │
│   (verb)        │
│                 │
└─────────────────┘
```

**Card Back Design:**
```text
┌─────────────────────────┐
│ ESCOVAR                 │
│                         │
│ to brush                │
│                         │
│ Why: Common daily verb  │
│ used in morning routine │
│                         │
│ From: Morning Routine   │
└─────────────────────────┘
```

### Phase 3: Flashcard Service Update

Add to `src/services/flashcardService.ts`:

```typescript
interface FlashcardExportData {
  id: string;
  phrase: string;
  translation: string;
  why: string;
  difficulty: string;
  videoTitle: string;
  language: string;
}

async function getFlashcardsForExport(userId: string): Promise<FlashcardExportData[]>
```

### Phase 4: PDF Download Button Component

Create `src/components/subscription/PdfDownloadButton.tsx`:

**Props:**
- `userId: string`
- `isPremium: boolean`
- `flashcardCount: number`
- `username: string`
- `language: string`

**States:**
- `isGenerating: boolean` - Loading state
- `showUpgradePrompt: boolean` - For free users

**Button Variants:**
1. **Free User (Locked):**
   - Grayed out with lock icon
   - Text: "Download PDF 🔒"
   - Subtitle: "Premium only"
   - OnClick: Shows UpgradePrompt

2. **Premium User (Enabled):**
   - Primary color with download icon
   - Text: "Download PDF"
   - OnClick: Generates and downloads PDF

3. **Loading State:**
   - Spinner icon
   - Text: "Generating PDF..."
   - Disabled

### Phase 5: Profile Page Integration

Update Flashcards section (lines 613-642):

```tsx
<CardContent>
  <div className="text-center py-6">
    {/* ... existing flashcard count UI ... */}
    
    {/* Action buttons row */}
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button 
        onClick={() => setShowFlashcardRepository(true)} 
        disabled={flashcardCount === 0}
        className="gap-2"
      >
        <BookOpen className="h-4 w-4" />
        Start Study Session
      </Button>
      
      <PdfDownloadButton
        userId={user.id}
        isPremium={subscription?.tier === 'premium' || subscription?.tier === 'promo'}
        flashcardCount={flashcardCount}
        username={profile?.username || profile?.display_name || 'User'}
        language={profile?.selected_language || 'english'}
      />
    </div>
  </div>
</CardContent>
```

---

## User Flows

### Free User Flow
1. User sees "Download PDF 🔒" button with "Premium only" label
2. User clicks button
3. UpgradePrompt modal appears with:
   - Title: "Upgrade to Premium"
   - Description: "Download your flashcards as printable PDFs..."
   - Benefits list (PDF downloads, unlimited videos, etc.)
   - Upgrade button -> navigates to /premium
   - Promo code input option
4. User can close modal or upgrade

### Premium User Flow
1. User sees "Download PDF" button (enabled, primary color)
2. User clicks button
3. Button shows "Generating PDF..." with spinner
4. PDF is generated client-side (2-5 seconds)
5. Browser downloads file: `flashcards_username_2026-02-03.pdf`
6. Toast notification: "Your flashcards PDF has been downloaded!"

### Edge Cases
- **No flashcards:** Button disabled, shows "Complete a lesson first"
- **Error during generation:** Toast error "Failed to generate PDF. Please try again."
- **Large collection (100+ cards):** Warning but proceed (PDF handles it)

---

## Technical Specifications

### PDF Dimensions
- Page: A4 (210 x 297mm)
- Margins: 10mm all sides
- Card grid: 2 columns x 3 rows = 6 cards/page
- Card size: 90mm x 75mm
- Font: Helvetica (built into jsPDF)

### File Naming
`flashcards_${username.toLowerCase()}_${YYYY-MM-DD}.pdf`
Example: `flashcards_shaytz_2026-02-03.pdf`

### Colors (Matching App Theme)
- Primary: #22c55e (green)
- Text: #1a1a1a
- Muted: #6b7280
- Background: #ffffff
- Border: #e5e7eb

---

## Files Changed Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `package.json` | Modify | Add jspdf dependency |
| `src/services/pdfGeneratorService.ts` | Create | PDF generation logic |
| `src/services/flashcardService.ts` | Modify | Add export function |
| `src/components/subscription/PdfDownloadButton.tsx` | Create | Download button component |
| `src/components/ProfilePage.tsx` | Modify | Add button to Flashcards section |

---

## Error Handling

1. **No flashcards:** Disable button, show helper text
2. **PDF generation error:** Try-catch with toast notification
3. **Not authenticated:** Check user exists before generating
4. **Subscription check failure:** Default to showing locked state

---

## Success Feedback

Using existing `toast` from sonner:
```typescript
toast.success("Your flashcards PDF has been downloaded!");
```

---

## Testing Checklist

- [ ] Free user sees locked button with upgrade prompt on click
- [ ] Premium user can download PDF successfully
- [ ] PDF contains cover page with correct user info
- [ ] PDF contains all flashcard fronts and backs
- [ ] Cards are formatted correctly for printing
- [ ] Loading state shows during generation
- [ ] Success toast appears after download
- [ ] Error handling works for edge cases
- [ ] Button disabled when no flashcards exist
- [ ] Filename format is correct
