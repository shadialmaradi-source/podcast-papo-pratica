# Product Vision

## Mission
Papo Prática helps language learners build speaking confidence through short, structured lesson flows tied to authentic podcast and video content, while giving teachers lightweight assignment and progress workflows.

## Core user journeys

### Student journey (must remain stable)
1. Discover the product from landing pages and blog content.
2. Authenticate and complete onboarding (target language, native language, level).
3. Start first lesson and continue into app lessons.
4. Practice with transcript-aware exercises, speaking tasks, vocabulary/flashcards, and review sessions.
5. Track progress over time in profile/home experiences.

### Teacher journey (must remain stable)
1. Authenticate and access teacher onboarding/dashboard.
2. Create and manage lessons/assignments.
3. Share student lesson links.
4. Monitor students and analytics.
5. Manage subscription/pricing-related controls.

## Product constraints
- Keep onboarding and first-lesson continuity reliable across auth redirects and shared lesson links.
- Keep language handling explicit and predictable:
  - `selected_language` as target learning language.
  - `native_language` for translations and hints.
- Preserve canonical learning surfaces: transcript-based lessons, speaking assignments, and flashcard/vocabulary practice.
- Prefer incremental, behavior-preserving refactors over architectural rewrites.

## Quality goals
- Routing, auth guards, and role-based flows should have a single clear ownership path.
- Shared helpers should be reused instead of re-implementing fallback logic in components.
- Type safety and linting should catch stale imports, dead code, and fragile patterns before merge.
- Build outputs should remain production-safe and not introduce route-level regressions.
