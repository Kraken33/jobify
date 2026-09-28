# Design

## Context

See `proposal.md` for motivation. Currently, `CandidateProfile`, `JobListing`, `SearchCriteria`, `SearchSession`, and `ScanCheckpoint` do not track spoken languages or CEFR levels. Pre-filtering (`src/lib/matching/preFilter.ts`) evaluates remote mode, seniority, and salary thresholds, but ignores language requirements. Provider fingerprinting (`src/lib/providers/fingerprint.ts`) computes hashes over skills, seniority, work mode, and location without considering language parameters.

## Goals / Non-Goals

**Goals:**
- Provide a clear, type-safe data model for spoken languages with CEFR levels (`A1`, `A2`, `B1`, `B2`, `C1`, `C2`, `Native`).
- Implement hard pre-filtering in `evaluateHardConstraints` enforcing CEFR level hierarchy ($L_{\text{candidate}} \ge L_{\text{job}}$).
- Update provider fingerprint calculation so spoken language filter changes invalidate pagination cursors correctly.
- Expand provider ingestion normalization (JustJoin.it, Arbeitsagentur, fallback pools) to extract language fields.
- Include candidate and job language requirements in OpenAI evaluation prompt.
- Update UI forms and job cards (`ProfileForm`, `CreateSessionModal`, `JobCard`) to support managing and displaying spoken languages.

**Non-Goals:**
- Automated natural-language translation of job listings across missing languages.
- Hard pre-filtering when a job listing specifies no language requirements whatsoever (assumed accessible).

## Decisions

### Decision 1: Numeric Ranking Scale for CEFR Gradation
- **Choice**: Map CEFR levels to integers: `A1: 1`, `A2: 2`, `B1: 3`, `B2: 4`, `C1: 5`, `C2: 6`, `Native: 7`.
- **Rationale**: Enables direct numeric comparison ($L_{\text{candidate}} \ge L_{\text{job}}$) cleanly without complex string comparisons.
- **Alternatives Considered**: String matching or loose tag filtering. Discarded because `B1` vs `C1` requires ordinal comparison.

### Decision 2: Hard Constraint Rule for Spoken Languages
- **Rule**: For every language explicitly required by a job listing ($L_{\text{job}}$):
  1. The candidate MUST have that language listed in their profile/session.
  2. The candidate's level $L_{\text{candidate}}$ MUST be $\ge L_{\text{job}}$.
- **Rationale**: Prevents candidates from receiving high match scores or spending LLM tokens on jobs requiring a language level they cannot fulfill.
- **Alternatives Considered**: Soft scoring only via LLM. Discarded because mandatory language requirements (e.g. German C1 in Germany) are non-negotiable hard constraints.

### Decision 3: Fingerprint Invalidation Scope
- **Choice**: Include sorted `spokenLanguages` in `computeProviderFingerprint`.
- **Rationale**: When a user changes session language constraints (e.g., adding `German B2`), cached search results and cursor state for that session must be invalidated to re-fetch/re-filter fresh jobs.

## Risks / Trade-offs

- **[Risk] Provider listings missing explicit CEFR levels** → **Mitigation**: Default provider parsing to infer standard levels when explicit CEFR tags are missing (e.g. "German required" defaults to `B1` or `B2` depending on provider context).
- **[Risk] User profile without language data** → **Mitigation**: Make spoken language fields optional in profile/session; when omitted, language hard constraint checks are skipped.

## Migration Plan

1. Update `src/types/index.ts` with `SpokenLanguageLevel` and `SpokenLanguage` interfaces.
2. Update `src/lib/matching/preFilter.ts` with CEFR comparison helper.
3. Update `src/lib/providers/fingerprint.ts` to include `spokenLanguages`.
4. Update `src/lib/matching/aiMatcher.ts` to forward spoken languages to OpenAI prompt.
5. Update provider adapters (`JustJoinProvider`, `ArbeitsagenturProvider`, fallback pools).
6. Update UI components (`ProfileForm`, `CreateSessionModal`, `JobCard`).
