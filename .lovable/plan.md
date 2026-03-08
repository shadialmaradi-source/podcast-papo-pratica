

# Plan: Create Teacher Landing Page at `/teachers`

## Overview
Create a professional, conversion-focused landing page for language tutors at `/teachers` with 8 sections (hero, problems, how it works, features, pricing, testimonials, FAQ, footer CTA). Add route, link from main landing page header, and PostHog tracking.

## Files to Create/Modify

### 1. New: `src/pages/TeacherLanding.tsx`
Full landing page with these sections, using the same motion/framer-motion patterns as `LandingPage.tsx`:

- **Header**: Fixed top bar with ListenFlow logo, "For Students" link (→ `/`), "Log in" button (→ `/auth`)
- **Hero**: Title, subtitle, "Start Free Trial" button → `/auth?role=teacher`, gradient background with professional styling
- **Problems We Solve**: 3-column grid with problem → solution pairs (red cross → green check pattern)
- **How It Works**: 4-step numbered flow (Create account → Add students → Assign paths → Track progress)
- **Features**: 6-card grid with icons (BookOpen, Brain, BarChart3, Target, Share2, RefreshCw)
- **Pricing**: 3-tier cards (Free/Pro $19/Premium $39) with feature lists and CTA buttons. Free → `/auth?role=teacher`, paid → `/auth?role=teacher` (Stripe integration later)
- **Testimonials**: 2-3 placeholder quotes with names/titles
- **FAQ**: Accordion with 3 questions
- **Footer CTA**: "Join 100+ tutors" + Start Free Trial button

Design: Clean, minimal, professional — uses existing card/button components, no emojis in code (use lucide icons instead).

### 2. Modify: `src/App.tsx`
- Import `TeacherLanding`
- Add public route: `<Route path="/teachers" element={<TeacherLanding />} />`

### 3. Modify: `src/pages/LandingPage.tsx`
- Add "For Teachers" link in the fixed header, next to the "Log in" button

### 4. Modify: `src/pages/Auth.tsx`
- Read `?role=teacher` from URL search params
- If present, pre-select teacher role or show a note that they're signing up as a teacher
- Track `teacher_landing_cta_clicked` event

### 5. Analytics
- Fire `teacher_landing_viewed` on page mount via `trackEvent`
- Fire `teacher_landing_cta_clicked` on each CTA click

## No database changes needed.

