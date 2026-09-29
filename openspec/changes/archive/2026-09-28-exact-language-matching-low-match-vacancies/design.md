# Design

## Context

See `proposal.md` for motivation and background.

Currently, `preFilterJobs()` in `preFilter.ts` evaluates hard constraints (work mode, seniority, salary, spoken language levels) and drops any failing jobs prior to AI scoring. `api/match/route.ts` receives only `eligibleJobs` and completely excludes non-matching jobs from the response payload. Furthermore, `JustJoinProvider` normalizes raw Apify items into `JobListing` objects without populating `spokenLanguages`, causing jobs with language requirements to bypass language constraint checks entirely.

## Goals / Non-Goals

**Goals:**
- Extract spoken language requirements (`spokenLanguages`) during JustJoin listing normalization.
- Perform exact multi-language constraint checks: candidate must possess ALL required languages of a job at or above the specified CEFR level.
- Refactor the pre-filter & matching pipeline so that hard constraint failures are converted into low-match evaluations (score 25%, verdict `Low Match`, gap explanations) rather than hidden/dropped.
- Return all parsed vacancies in the `/api/match` endpoint response, sorted by score descending, placing low-match/constraint-mismatched vacancies at the very bottom.

**Non-Goals:**
- Changing the OpenAI prompt structure or token budgets for eligible jobs.
- Modifying session checkpointing or fingerprint calculation logic.

## Decisions

### Decision 1: Soft Pre-Filter Pipeline in `/api/match/route.ts`

Instead of calling `preFilterJobs()` which filters out failing listings:
1. Iterate over `unseenListings` and run `evaluateHardConstraints(profile, job)` on each item.
2. Group listings into:
   - `eligibleJobs`: `passed: true` (sent to OpenAI AI Matcher for LLM evaluation).
   - `mismatchedJobs`: `passed: false` (converted directly into synthetic low-match `MatchResult` objects without making OpenAI API calls).
3. For each item in `mismatchedJobs`, create a `MatchResult`:
   - `evaluation.score`: 25
   - `evaluation.verdict`: `'Low Match'`
   - `evaluation.pros`: `['Matched provider keyword/location criteria']`
   - `evaluation.gaps`: `[evalResult.reason || 'Does not satisfy hard profile constraints']`
   - `evaluation.summary`: `'Automated evaluation: soft constraint failure.'`
4. Merge AI-scored results and synthetic low-match results.
5. Sort all combined results by `evaluation.score` descending so high/medium matches appear first and low matches appear at the very bottom.

### Decision 2: Spoken Language Extraction in `JustJoinProvider.ts`

Enhance `normalizeApifyItem` and `normalizeOffer` in `JustJoinProvider.ts`:
- Scan skill objects (`raw.requiredSkills`, `raw.skills`, `raw.niceToHave`) and `raw.description` for language indicators (e.g. "English", "Polish", "German") and CEFR levels ("A1" through "C2", "Native").
- Map recognized language patterns to `SpokenLanguage[]` (e.g. `{ language: 'Polish', level: 'C2' }`).
- Populate `spokenLanguages` on the returned `JobListing`.

### Decision 3: Exact Spoken Language Validation in `preFilter.ts`

Ensure `evaluateHardConstraints` in `preFilter.ts`:
- Loops through all entries in `job.spokenLanguages`.
- Checks if candidate profile has a corresponding entry matching the language name (case-insensitive).
- Verifies `candidateCEFR >= jobCEFR`.
- If candidate lacks any required language or fails the level check, returns `{ passed: false, reason: 'Candidate missing required spoken language: ...' }`.

## Risks / Trade-offs

- **[Risk]** Spoken language names in descriptions or raw skills may be formatted inconsistently (e.g., "polski", "pl", "Polish").
  → *Mitigation*: Implement a robust normalization dictionary for language names (e.g., mapping "polski", "pl", "polish" -> "Polish").
- **[Risk]** Synthetic low-match results might inflate the result array size returned to the frontend.
  → *Mitigation*: Maintain current pagination limit on newly parsed jobs per scan step, ensuring all fetched unseen jobs are displayed without performance degradation.
