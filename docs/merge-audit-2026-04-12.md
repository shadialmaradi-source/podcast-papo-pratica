# Merge Audit — React + TypeScript

Date: 2026-04-12

## Scope
Strict post-merge audit focused on hidden merge mistakes:
- leftover artifacts
- mixed/partial merge resolutions
- broken references
- compile/runtime risks

## Commands run
- `rg -n "^(<<<<<<<|=======|>>>>>>>)" -S .`
- `npm ci` (failed; lockfile/package mismatch)
- `npm -s exec tsc --noEmit` (pass)
- `npm run -s lint` (failed in current environment due dependency resolution)

## Findings

### 1) Critical — lockfile/package manifest are out of sync
- **File:** `package.json`, `package-lock.json`
- **Smell:** `package.json` pins `jspdf` to `4.2.1`, while `package-lock.json` still records `^2.5.2`. `npm ci` fails with explicit mismatch and missing transitive deps.
- **Why merge-related:** lockfiles are commonly affected by manual conflict resolution; this is the classic symptom of mixed lock sections from different branches.
- **Minimal fix:** regenerate and commit lockfile from clean state (`rm -rf node_modules package-lock.json && npm install`), then re-run CI checks.

### 2) Medium — duplicate interface fields in lesson model
- **File:** `src/pages/TeacherLesson.tsx`
- **Smell:** `Lesson` interface declares `paragraph_content` and `paragraph_prompt` twice.
- **Why merge-related:** duplicate fields usually appear when both branches added same properties in adjacent chunks and both were kept.
- **Minimal fix:** keep one declaration of each field in `Lesson` interface.

### 3) Low — split duplicate imports from same module (mixed merge style)
- **Files:**
  - `src/components/EpisodePlayer.tsx`
  - `src/hooks/useCreateLesson.ts`
  - `src/components/teacher/LessonPostCreationView.tsx`
  - `src/pages/TeacherLesson.tsx`
  - `src/hooks/useTranslation.tsx`
  - `src/pages/AdminImport.tsx`
- **Smell:** same module imported in multiple separate statements where a single merged import should exist.
- **Why merge-related:** common after keeping both branch-side import edits instead of consolidating.
- **Minimal fix:** combine imports from identical module path into one statement per file.

## Notes
- No unresolved conflict markers were found.
- TypeScript compile (`tsc --noEmit`) passed after local dependency availability.
