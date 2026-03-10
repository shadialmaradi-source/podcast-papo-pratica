

# Rewrite Teacher Landing Hero Section

## Changes

**File: `src/pages/TeacherLanding.tsx`**

1. Add `useState` import and `Play` icon from lucide-react
2. Add `showDemoModal` state
3. Replace hero section (lines 164-191) with new two-column layout:
   - Left: Bold headline with colored numbers (red "5 Hours/Week", green "2 Minutes"), subheadline with paste→AI→learn flow, dual CTAs, trust line with avatar placeholders, trial info
   - Right: Screenshot placeholder with floating "1m 47s" badge
4. Add demo video modal using Dialog component (already imported in project)
5. Add `Timer` icon import for the floating badge

## Hero Layout

```text
┌──────────────────────────────────────────────┐
│  Header (unchanged)                          │
├──────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐   │
│  │ Stop Spending    │  │ ┌──────────────┐ │   │
│  │ 5 Hours/Week ... │  │ │  Screenshot  │ │   │
│  │                  │  │ │  Placeholder │ │   │
│  │ [Primary CTA]    │  │ └──────────────┘ │   │
│  │ [Demo CTA]       │  │ ┌────────┐       │   │
│  │                  │  │ │ 1m 47s │       │   │
│  │ ✓ 14-day trial   │  │ └────────┘       │   │
│  │ 👤👤👤 Trusted.. │  │                  │   │
│  └─────────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────┘
```

## Specific Edits

- **Line 1**: Add `useState` to import
- **Line 29**: Add `Play, Timer` to lucide imports
- **Lines 132-133**: Add `const [showDemoModal, setShowDemoModal] = useState(false);`
- **Lines 164-191**: Replace entire hero section with new two-column layout + modal
- Keep all other sections unchanged

