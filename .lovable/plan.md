

## Fix Post-Onboarding Flow and Remove Legacy Dashboard

### Problem Analysis

After completing the first lesson, users are shown the `LessonComplete` component which correctly routes to `/auth` for signup. However, there's confusion about where users end up:

1. **Current First Lesson CTA**: Both "Next Lesson" and "Try Your Own Video" navigate to `/auth` - this is correct for signup prompt
2. **Old Dashboard**: The legacy `Dashboard.tsx` component (with the red YouTube card) is still accessible via `/app/legacy` and `Index.tsx`
3. **User reached old version**: Based on the screenshot, the user somehow ended up on the old Dashboard after registration

### Solution

#### 1. Delete Legacy Code (Remove Old Dashboard)

**Files to Remove:**
- `src/pages/Index.tsx` - Legacy app entry point with complex state machine
- `src/components/Dashboard.tsx` - Old dashboard with red YouTube card
- `src/components/LanguageSelector.tsx` - Only used by Index
- `src/components/LearningDestinationModal.tsx` - Only used by Dashboard
- `src/components/LanguageSelectionModal.tsx` - Only used by Dashboard

**Update `src/App.tsx`:**
- Remove the `/app/legacy` route completely
- Remove imports for Index.tsx

```typescript
// REMOVE this route block:
<Route 
  path="/app/legacy" 
  element={
    <ProtectedRoute>
      <Index />
    </ProtectedRoute>
  } 
/>
```

#### 2. Improve First Lesson Complete CTA

The current `LessonComplete.tsx` shows "Next Lesson" and "Try Your Own Video" buttons, both going to `/auth`. This is correct for the signup prompt, but we should:

**Update `src/components/lesson/LessonComplete.tsx`:**
- Make the signup intent clearer in the button text
- Add a welcome message explaining why registration is needed

```text
Current:
  [→ Next Lesson]
  [Try Your Own Video]

Improved:
  "🎉 You completed your first lesson!"
  "Create a free account to continue learning"
  
  [Create Account →] (primary CTA)
  [Sign In] (secondary link for existing users)
```

#### 3. Ensure Proper Post-Auth Redirect

**Verify `src/pages/Auth.tsx` and `src/pages/AuthCallback.tsx`:**
- Both already redirect to `/app` (the new AppHome) ✓
- The new `AppHome.tsx` is the correct destination

### Files to Modify

| File | Action |
|------|--------|
| `src/App.tsx` | Remove `/app/legacy` route and Index import |
| `src/components/lesson/LessonComplete.tsx` | Improve CTA messaging for registration |

### Files to Delete

| File | Reason |
|------|--------|
| `src/pages/Index.tsx` | Legacy app entry point - no longer needed |
| `src/components/Dashboard.tsx` | Old dashboard with red YouTube card |
| `src/components/LanguageSelector.tsx` | Only used by legacy Index |
| `src/components/LearningDestinationModal.tsx` | Only used by legacy Dashboard |
| `src/components/LanguageSelectionModal.tsx` | Only used by legacy Dashboard |

### Updated User Flow

```text
Landing Page (/)
     ↓
Onboarding (/onboarding) - Select language + level
     ↓
First Lesson (/lesson/first) - Intro → Video → Exercises → Speaking → Flashcards
     ↓
Lesson Complete - Show stats + "Create Account" CTA
     ↓
Auth (/auth) - Register or sign in
     ↓
App Home (/app) - Clean design with "Learn from Library" + "Your Own Video"
     ↓
Library (/library) or Lesson (/lesson/:videoId)
```

### Technical Notes

- The new `AppHome.tsx` already has the clean design with green "Learn from Library" button and neutral "Your Own Video" button
- All protected routes (`/app`, `/library`, `/lesson/:videoId`, `/profile`) will continue to work
- The subscription/quota system integrated in AppHome will continue to function

