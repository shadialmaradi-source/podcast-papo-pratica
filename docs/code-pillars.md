# Code Pillars

## 1) Single source of truth for cross-cutting concerns
- Centralize auth/session state in `useAuth` and role state in `useUserRole`.
- Centralize onboarding routing rules in `src/utils/onboardingStatus.ts`.
- Centralize language normalization and display helpers in `src/utils/languageUtils.ts`.
- Avoid recreating fallback chains inside page-level components.

## 2) Route-level reliability and guard consistency
- Public/auth callback/reset-password routes must remain unguarded.
- Student and teacher routes must use `ProtectedRoute` with explicit role handling where required.
- Legacy route redirects should remain deterministic and use `replace` to avoid history loops.

## 3) Service and UI separation
- Data-fetching and transformation logic belongs in `src/services/*` and hooks.
- Components/pages should focus on composition and user interaction.
- If a utility already exists in `src/utils/*`, prefer that over ad hoc implementations.

## 4) Type-first changes
- Favor explicit types over `any` in services/hooks where possible.
- Ensure Supabase query payload assumptions are narrowed before UI use.
- Keep route params, API responses, and derived state aligned to avoid runtime undefined access.

## 5) Safe evolution over rewrite
- Do not revert merged architecture unless a concrete break is proven.
- For high-risk fixes (auth/onboarding/routing contracts), propose and stage changes with minimal blast radius.
- Every consistency fix should include checks: lint, typecheck, tests (if present), and build.

## 6) Documentation and onboarding hygiene
- When introducing patterns, update docs in `docs/` so future changes stay consistent.
- Keep naming consistent across pages/components/hooks/services to reduce cognitive load.
