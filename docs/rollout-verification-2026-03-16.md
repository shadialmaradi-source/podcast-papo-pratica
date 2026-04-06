# Rollout Verification – 2026-03-16

Scope: verified only these applied fix batches:

1. First-lesson native-language coverage
2. Browser-language / UI-language stabilization
3. Auth redirect stabilization
4. Segmented-lesson consistency stabilization
5. Email-confirmation signup UX cleanup

Excluded by design:
- Tutorial popup behavior
- Profile/Library navigation behavior

## Findings summary

All five scoped batches appear applied in the current codebase with no obvious regressions between them.

### Confirmed remaining gaps

1. **Medium** – Browser-language detector currently maps only `en/es/fr/it/pt`, while translation language codes include additional locales.
2. **Low** – Pending lesson token is persisted in localStorage and cleared on successful consume, but there is no expiry path for abandoned flows.
3. **Low** – Segmented exercises effect is keyed by `sceneId`; transcript-only changes with same scene id do not retrigger regeneration.
4. **Low** – Email-confirmation UX depends on matching provider error text (`"email not confirmed"`).

## Notes

This document is a snapshot verification artifact for rollout tracking and does not change runtime logic.
