

# "Help shape ListenFlow" Feedback Section

## What

Add a lightweight feedback form section just above the footer on the landing page, and create a reusable `FeedbackSection` component.

## Plan

### 1. Create `src/components/FeedbackSection.tsx`

A self-contained component with local state management:

- **Fields**: name (optional input), email (optional input), category (Select dropdown: Feedback / Bug / Feature request), message (required Textarea)
- **Validation**: only `message` is required; disable submit when empty
- **Submit handler**: for now, just logs to console and shows success state (no backend). This keeps the patch minimal and avoids needing edge functions or DB tables.
- **Success state**: replaces the form with a thank-you message and a checkmark icon, with a fade-in animation
- **Style**: uses existing UI primitives (Input, Textarea, Select, Button, Card) and Tailwind classes consistent with the landing page. Subtle `bg-muted/30` background section, max-width container, clean spacing.

### 2. Update `src/pages/LandingPage.tsx`

- Import `FeedbackSection`
- Place it between the Final CTA section and the Mobile Fixed Bottom CTA (before `</main>`)
- No other changes to the page

### Files changed

| File | Change |
|------|--------|
| `src/components/FeedbackSection.tsx` | New ~90-line component |
| `src/pages/LandingPage.tsx` | Import + render `<FeedbackSection />` (~2 lines) |

