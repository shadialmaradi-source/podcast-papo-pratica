# Project Analysis (Non-Technical, Founder-Friendly)

## Executive summary
Great direction: you want to **clean the code without deleting core value**. That is exactly the right move now.

Your updated strategy should be:
1. **Keep core learning experience fully intact**.
2. **Remove only selected teacher modules** (community + branding).
3. **Refactor for quality and speed** without reducing main features.

---

## Feature scope you asked for (locked)

### Keep (Student)
- Onboarding
- Video lesson flow
- Transcript viewer
- Interactive transcript functions
- Fragmented lesson flow

### Keep (Teacher)
- All key teacher workflows except community and branding
- Flashcard functionality

### Remove (Teacher)
- Community feature/module
- Branding feature/module

> Rule: clean architecture and UX, but do **not** remove the protected feature set above.

---

## Revised improvement plan (based on your priorities)

### 1) Stabilize code quality first (HIGH)
Current lint output shows high technical debt. Do a focused cleanup sprint, but only refactor behavior-preserving parts.

**Action:**
- Fix repeated lint categories (`any` types, hook dependencies, minor syntax issues).
- Add a "no new lint errors" rule for every new change.
- Keep all locked features functional while refactoring.

### 2) Reduce complexity by pruning only what you approved (HIGH)
Instead of broad feature reduction:
- Remove/hide teacher community pages/routes/components.
- Remove/hide teacher branding pages/routes/components.
- Keep flashcards and all core student learning flows.

### 3) Improve performance without removing learning value (HIGH)
Large bundles indicate load-time risk.

**Action:**
- Split large components into smaller parts.
- Lazy-load heavy teacher modules and non-critical tools.
- Set bundle budget targets and monitor build size regularly.

### 4) Modularize the biggest files (MEDIUM/HIGH)
Very large files should be broken into:
- UI sections
- hooks (data/state)
- service/helper functions

This reduces bugs and makes future Lovable prompts more reliable.

### 5) Tooling cleanup (MEDIUM)
- Choose one package manager (npm or bun).
- Keep one lockfile only.
- Keep README commands simple and consistent.

---

## What to remove now (safe list)
1. Teacher **Community** module (route + nav + page/components + unused services).
2. Teacher **Branding** module (route + nav + page/components + unused services).
3. Any dead code left after removing those two modules.

## What NOT to remove
- Student onboarding/video/transcript/interactive transcript/fragmented lesson.
- Teacher flashcard capabilities.
- Core assignment and lesson flows.

---

## Lovable prompt (copy/paste)
Use this prompt directly in Lovable:

```txt
Refactor and simplify this project with these strict product constraints:

GOALS:
1) Clean code and improve maintainability.
2) Improve performance (smaller initial bundles, better lazy loading).
3) Remove only approved features.

DO NOT REMOVE (MUST KEEP WORKING):
- Student onboarding flow
- Student video lesson flow
- Transcript viewer
- Interactive transcript features
- Fragmented lesson flow
- Teacher flashcard functionality
- Core teacher lesson/assignment workflows

REMOVE:
- Teacher Community feature/module (including routes, navigation links, page components, and dead related code)
- Teacher Branding feature/module (including routes, navigation links, page components, and dead related code)

IMPLEMENTATION RULES:
- Preserve existing behavior for all kept features.
- Refactor oversized components into smaller components + hooks + service helpers.
- Improve route-level code splitting and lazy loading.
- Do not introduce breaking UI/UX changes in kept flows.
- If a deletion is risky, hide behind feature flags first, then remove in a second pass.

QUALITY GATES:
- Run lint and fix high-frequency issues first.
- Run production build and report chunk-size changes.
- Summarize exactly what was removed vs what was preserved.

OUTPUT FORMAT:
1) Files changed
2) Removed modules/components/routes
3) Preserved critical flows checklist
4) Lint/build results
5) Follow-up recommendations
```

---

## 30-day execution roadmap

### Week 1
- Remove community + branding routes/nav safely.
- Confirm protected student and flashcard flows still work.

### Week 2
- Refactor top 3 largest components without behavior changes.
- Re-test onboarding, lesson, transcript, flashcards.

### Week 3
- Improve chunk splitting and lazy loading.
- Compare build output before/after.

### Week 4
- Final dead-code cleanup + lint debt reduction pass.
- Freeze and document stable architecture.

---

## KPI dashboard (simple)
Track weekly:
- First lesson completion rate
- Transcript interaction usage rate
- Flashcard usage (teacher/student)
- Load time on first app screen
- Number of regressions after refactors

If these improve while feature set remains intact, the cleanup is successful.
