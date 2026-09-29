# Design

## Context

See `proposal.md – Why` for motivation.

The system has three layers where language filtering can act:

1. **Provider query** — parameters sent to the Apify actor / Arbeitsagentur REST API to narrow results before they arrive.
2. **Extraction heuristic** — `JustJoinProvider.extractSpokenLanguages`, which inspects tech stack skill tags and description text to populate `JobListing.spokenLanguages`.
3. **Pre-filter** — `evaluateHardConstraints` in `preFilter.ts`, which already correctly compares `job.spokenLanguages` against `profile.spokenLanguages` once the data is accurate.
4. **LLM evaluation** — `AiMatcherService.evaluateFit`, which reads the vacancy description and candidate profile to produce a fit score.

The current bug manifests because layer 2 is imprecise: it either (a) attaches a false-positive spoken-language entry (e.g., treating the `pl` skill tag as Polish), causing valid jobs to be filtered out, (b) produces no `spokenLanguages` even when a description clearly states "Fluent Polish required", or (c) misses spoken languages listed in tech stack arrays (`niceToHave`, `techStack`, `skills_tags`) or skill objects containing `level`/`value` properties.

## Goals / Non-Goals

**Goals:**
- Fix false-positive and false-negative language extraction in `extractSpokenLanguages` by unifying all raw tech stack arrays (`requiredSkills`, `skills`, `niceToHave`, `techStack`, `tech_stack`, `skills_tags`) and stringifying full skill objects (`name`, `level`, `value`, `title`).
- Add a provider-side language hint to the Apify actor input when the actor supports it, reducing noise from the source.
- Augment the LLM prompt to explicitly detect hidden language requirements in descriptions when `spokenLanguages` is absent, as a safety net.

**Non-Goals:**
- Changing the `evaluateHardConstraints` logic (it is already correct by design).
- Adding a language filter to Arbeitsagentur queries — the public API (`/pc/v6/jobs`) does not expose a language parameter; language filtering for that provider remains entirely client-side.
- Translating vacancies or normalizing non-English CEFR descriptions beyond what the heuristic already handles.

## Decisions

### Decision 1 — Fix `extractSpokenLanguages` heuristic to inspect all tech stack arrays and object properties

**Rationale:** Employers put language requirements in various tech stack locations (e.g., `requiredSkills`, `skills`, `niceToHave`, `techStack`, `tech_stack`, `skills_tags`) and format them as objects with `level` or `value` fields (e.g. `{ name: 'Polish', level: 'advanced' }`). Short-circuit fallback array selection (`raw.requiredSkills || raw.skills || ...`) lost secondary skill lists where languages were declared.

**How to unify tech stack sources:**
- Combine all raw skill arrays (`requiredSkills`, `skills`, `niceToHave`, `techStack`, `tech_stack`, `skills_tags`) into a single array.
- For each item in the combined skill array:
  - If string, inspect directly.
  - If object, stringify all textual properties (`name`, `title`, `level`, `value`, `description`) into a single space-delimited string before regex matching (e.g., `"Polish advanced C1"`).

**How to fix the false-positive (`pl` skill tag → Polish):**
- Match language keys as **whole tokens** (word-boundary match) rather than substring inclusion. For short two-letter codes (`pl`, `de`, `en`, `fr`, `es`) require that they appear as an isolated token (`\bpl\b`) rather than inside words like `playwright` or `TypeScript`.

**How to fix the false-negative (language in description not detected):**
- Always run description scanning alongside tech stack scanning. Language mentions in description should be merged with tech stack findings.
- Extend pattern matching to cover natural-language phrases: "fluent in X", "X language required", "communicative X", and common Polish phrases like "komunikatywność po angielsku/polsku/niemiecku".

### Decision 2 — Pass candidate languages to Apify actor input

**Rationale:** The `trev0n/justjoinit-scraper` actor accepts a `languages` input array (list of language codes). Including the candidate's known languages narrows results toward listings that mention those languages. This is a hint, not a hard filter, so it reduces noise rather than guaranteeing correctness.

**Implementation:** In `buildApifyInput`, if `criteria.spokenLanguages` is non-empty, map each language name to its ISO 639-1 code and include the array as `languages` in the actor input. If the actor ignores or does not support the field, the result is a no-op.

### Decision 3 — LLM prompt augmentation as a safety net

**Rationale:** Even with a corrected heuristic, edge cases will exist where a listing carries no `spokenLanguages` (e.g., a newly scraped listing with minimal field coverage). The LLM already receives the full description text and the candidate's spoken languages, so instructing it to check for hidden language requirements adds accuracy at negligible cost.

**Implementation:** In `AiMatcherService.evaluateFit`, add a conditional instruction block to the prompt: when `job.spokenLanguages` is absent or empty but `job.description` is non-empty, append "If the job description explicitly requires a spoken language the candidate does not have, include it as a critical gap and reduce the score accordingly."

## Risks / Trade-offs

- **Apify `languages` parameter may be undocumented or ignored** → The adapter will still function correctly; language filtering degrades to client-side only. Risk: low.
- **Word-boundary fix may introduce new false negatives** if a job description uses an unusual format (e.g., `(PL)` for Polish). Mitigation: also match parenthesized two-letter codes surrounded by whitespace.
- **LLM prompt injection risk** → The description text already flows into the prompt unchanged. Adding a language-check instruction does not introduce new injection surface. Risk: unchanged.
