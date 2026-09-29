# Proposal

## Why

The system currently shows vacancies with language requirements that don't match the candidate's profile (e.g., listings requiring Polish when the candidate has no Polish experience). This happens because: (1) providers don't expose a server-side language filter, so language-mismatched listings slip through to LLM evaluation; (2) the `extractSpokenLanguages` heuristic in JustJoinProvider sometimes misidentifies short technology codes (e.g. `pl`) as language requirements, or fails to detect actual language requirements in descriptions; and (3) employers frequently list spoken languages inside tech stack tags or secondary skill arrays (e.g., `niceToHave`, `techStack`, `skills_tags`), which were missed when only a single skill array was inspected. As a result, language pre-filtering in `evaluateHardConstraints` either wrongly rejects valid jobs or wrongly passes language-mismatched ones.

## What Changes

- **Provider-side language filter**: When building the search query (JustJoin Apify input and Arbeitsagentur URL), pass candidate spoken language criteria to the provider where the underlying API/actor supports a language filter parameter. This reduces language-mismatched listings at the source.
- **Comprehensive tech stack & description language extraction**: Refine `extractSpokenLanguages` in `JustJoinProvider` to merge all available tech stack arrays (`requiredSkills`, `skills`, `niceToHave`, `techStack`, `tech_stack`, `skills_tags`) and inspect both string tags and object properties (`name`, `level`, `value`, `title`). Correctly parse language requirements from both tech stack tags and descriptions while eliminating false positives (e.g., treating `pl` skill tag as Polish).
- **LLM-based language verification fallback**: After the heuristic extraction, when a listing passes the pre-filter but the pre-filter's language data is uncertain (e.g., `spokenLanguages` is undefined/empty despite description text), the AI matcher prompt SHALL be augmented to explicitly ask the LLM to verify whether the vacancy requires languages the candidate does not have, and produce a gap if so.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `job-provider-ingestion`: Add spoken-language filter to provider search queries where the underlying API supports it; combine all tech stack arrays and inspect full object fields in `extractSpokenLanguages` heuristic to accurately extract spoken languages from tech stack tags and descriptions.
- `job-matching-engine`: When a job listing's `spokenLanguages` field is absent or empty but a description is present, extend the AI matcher prompt to instruct the LLM to identify and flag language requirements the candidate cannot satisfy, surfacing them as explicit `gaps`.

## Impact

- `src/lib/providers/JustJoinProvider.ts` — `buildApifyInput` (add language filter), `extractSpokenLanguages` (refine heuristic to combine all tech stack arrays and object properties)
- `src/lib/providers/ArbeitsagenturProvider.ts` — `buildSearchUrl` (add language filter if supported by API)
- `src/lib/matching/aiMatcher.ts` — `evaluateFit` prompt (add language verification instruction)
- `src/lib/matching/preFilter.ts` — no logic changes; behavior is correct once provider language data is accurate
- Existing `job-provider-ingestion` and `job-matching-engine` specs require delta updates
