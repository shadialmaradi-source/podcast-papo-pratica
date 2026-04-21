

## Update `/teachers` pricing section to match the current model

The pricing block on `TeacherLanding.tsx` still advertises a 3-tier model (Free / Pro / Premium) with outdated Premium claims like "White-label option", "Custom video upload", and "API access". The live model in `TeacherPricing.tsx` is a 2-tier trial-first plan with concrete usage limits.

### Changes (single file: `src/pages/TeacherLanding.tsx`)

1. **Replace `pricingTiers` data** with the same two tiers used in `TeacherPricing.tsx`:
   - **Pro — $19/month** ("Perfect for active tutors"): Unlimited students · 30 lessons/month · Videos up to 10 min · All lesson types (YouTube, Paragraph, Speaking) · Student progress tracking · Basic analytics · Email support
   - **Premium — $39/month** ("For professional tutors", marked **Most Popular**): Everything in Pro, plus: · 100 lessons/month · Videos up to 15 min · Advanced analytics (retention, churn, engagement) · Email notifications when students complete · Priority support
   - Both CTAs: **Start Free Trial**

2. **Update the pricing section heading/subheading** to match the in-app page:
   - Title: "Choose Your Plan"
   - Subtitle: "Start with a 14-day free trial. No credit card required."

3. **Update the grid** from `md:grid-cols-3` to `md:grid-cols-2` and shrink `max-w-4xl` → `max-w-3xl` so two cards display correctly centered.

4. **Add small visual touches** to align with the in-app card:
   - Show a tier description line under the name (e.g. "Perfect for active tutors").
   - Keep existing "Most Popular" ribbon styling, applied to Premium (not Pro).

No other sections change. No data, route, or backend changes. The CTA still routes to `/auth?role=teacher` via the existing `handleCTA` handler — the trial is provisioned post-signup as it is today.

### Files touched

- `src/pages/TeacherLanding.tsx` — replace the `pricingTiers` array + the Pricing section markup (heading, subhead, grid columns, card description) so the public landing page mirrors the live 2-tier trial pricing model shown in `/teacher/pricing`.

