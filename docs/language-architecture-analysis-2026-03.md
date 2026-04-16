# Language Architecture Analysis (Why it's buggy + how to fix it)

## Your intended behavior (clear product rules)

You described the correct target behavior very clearly. This should be the product contract:

1. **Homepage/UI language**
   - Default to the phone/browser language automatically.
   - User can manually change it anytime.
   - App remembers their manual choice.

2. **Onboarding fields are separate concerns**
   - **Language to learn** (target language): English or Spanish (for now).
   - **Native language**: used for translations/hints.
   - **Level**: absolute beginner / beginner / intermediate / advanced.

3. **Lesson behavior**
   - If target language is English, lesson/video questions/speaking/flashcard front should be English.
   - If target language is Spanish, these should be Spanish.
   - Translations/hints/flashcard backs should be in native language.

4. **Main app behavior after onboarding**
   - Exercises should match transcript/video language.
   - "Translate question" should translate to user's native language.
   - Flags and language labels must match actual language source.

---

## Why the current implementation fails (root causes)

### Root cause A — one field is used for multiple meanings
The app uses `selected_language` for different purposes:
- Sometimes as **target language** (language to learn)
- Sometimes as **UI language**

This causes conflicting behavior and "random" language switches.

### Root cause B — mixed language formats
Code alternates between:
- language names (`english`, `spanish`, `italian`)
- language codes (`en`, `es`, `it`)

Because formats are mixed, lookups fail in some places (flags/translations/defaults), leading to wrong labels or fallback language.

### Root cause C — inconsistent fallback logic in different modules
Different components choose language using different chains:
- profile
- localStorage
- browser language
- hardcoded default (`english` or `italian`)

Result: user sees one language in one step and another language in the next step.

### Root cause D — exercise generation path missing explicit target language
At least one generation path calls the edge function without passing language; function then defaults internally, causing mismatched exercise language for the video.

### Root cause E — flashcards use weak language normalization
Flashcard generation/display mixes code/name formats and fallback assumptions, so translation language and flag can diverge from user's native language selection.

---

## Recommended architecture (simple and stable)

Use **three separate fields** and never mix them:

1. `ui_language` (ISO code, e.g. `en`, `it`, `es`)
   - For interface text/buttons/menus.

2. `target_language` (ISO code or canonical names, pick one and enforce)
   - Language user wants to learn.
   - Controls exercises, speaking, lesson prompts, flashcard front language.

3. `native_language` (ISO code, e.g. `it`, `en`, `pt`)
   - Controls translation hints, translated question helper, flashcard back language.

### Best default policy
- First visit: `ui_language = browser language` (automatic).
- Then show manual selector.
- After user selects manually, persist preference and stop auto-overriding.

This gives both convenience and control.

---

## What should happen in your exact onboarding

1. Homepage opens in browser language (automatic).
2. User starts onboarding in same UI language.
3. User picks:
   - target = English or Spanish
   - native = chosen native language
   - level = one of 4
4. `/lesson/first` should render lesson content from **target language**.
5. Exercises/speaking/flashcards must follow:
   - front/question language = target
   - translations = native
6. In app subscribed content:
   - video exercises must use **video/transcript language** as target
   - translation helper must use `native_language`.

---

## Prioritized fix plan (implementation order)

### Phase 1 — Data model and normalization
- Introduce explicit `ui_language` profile field.
- Keep `target_language` and `native_language` separate.
- Add shared normalization utility (single source of truth).

### Phase 2 — Language resolution service
Create one utility/hook to resolve language context everywhere:
- `getUILanguage()`
- `getTargetLanguage()`
- `getNativeLanguage()`

Remove duplicated fallback chains from components.

### Phase 3 — Lesson and onboarding consistency
- Ensure `/lesson/first` loads target-language content dynamically.
- Ensure speaking/exercises/flashcards read target/native from normalized source.

### Phase 4 — Generation and translation correctness
- Always pass explicit `target_language` and `native_language` to edge functions.
- Ensure exercise generation language comes from video/transcript when appropriate.
- Ensure translation helper always targets native language.

### Phase 5 — QA matrix (must test)
Test combinations:
- UI = Italian, target = English, native = Italian
- UI = English, target = Spanish, native = English
- UI = Spanish, target = English, native = Portuguese

For each: onboarding, first lesson, speaking, flashcards, in-app video exercises, question translation.

---

## Non-technical decision guidance: automatic vs manual?

Best practice is **both**:
- Automatic initial default from browser language (best UX first-time).
- Manual selector always available (best control, avoids wrong assumptions).
- Persist manual choice and never auto-replace it silently.

So your intuition is correct: default should match phone/browser, then user can change.

---

## Lovable prompt (copy/paste)

```txt
Refactor language handling with a strict 3-language model and remove all ambiguous logic.

PRODUCT RULES (MUST FOLLOW):
1) UI language defaults to browser language on first visit.
2) User can manually change UI language; manual choice is persisted and never auto-overridden.
3) Keep language fields separate:
   - ui_language (interface language)
   - target_language (language to learn: currently english or spanish)
   - native_language (translation/hints language)
4) Onboarding flow:
   - choose target language
   - choose native language
   - choose level (absolute beginner, beginner, intermediate, advanced)
5) First lesson and all lesson modules must respect language roles:
   - exercises/questions/speaking/flashcard front = target_language
   - translations/hints/flashcard back = native_language
6) In subscribed app video lessons:
   - exercise language must match video/transcript language (or explicit target context)
   - "translate question" output must always use native_language.
7) Flags and labels must always match normalized language values.

TECHNICAL REQUIREMENTS:
- Introduce a single language normalization layer (ISO code mapping + canonical values).
- Remove duplicated language fallback logic from individual components.
- Add a shared language context resolver hook/service used everywhere.
- Ensure edge function calls always pass explicit target_language and native_language.
- Remove hidden defaults like hardcoded italian/english when language is missing.

DO NOT BREAK:
- Onboarding flow
- Transcript and interactive transcript features
- Fragmented lesson
- Flashcards

DELIVERABLE FORMAT:
1) Data model changes (fields and migration)
2) Files refactored and why
3) Removed fallback/hardcoded language paths
4) QA checklist results for at least 3 language combinations
5) Remaining risks and follow-up recommendations
```

---

## Quick success criteria
After this refactor, these must always be true:
- Homepage language = browser default unless user manually changed it.
- First lesson language follows selected target language.
- Flashcard translation and translation helper follow native language.
- No module independently decides language with its own fallback chain.
