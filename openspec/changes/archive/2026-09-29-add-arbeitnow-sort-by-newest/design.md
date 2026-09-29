# Design

## Context

`ArbeitnowProvider` constructs web search URLs using `buildSearchUrl(criteria, page)` in `src/lib/providers/ArbeitnowProvider.ts`.
Currently, `buildSearchUrl` sets `params.set('sort_by', 'null')`. This query parameter string will be updated to `params.set('sort_by', 'newest')`.

## Goals / Non-Goals

**Goals:**
- Ensure all Arbeitnow web search URLs constructed by `ArbeitnowProvider.buildSearchUrl` include `sort_by=newest`.
- Update corresponding unit tests in `src/__tests__/arbeitnowProvider.test.ts` to verify `sort_by=newest` in built search URLs.

**Non-Goals:**
- Altering any other URL query parameters (`search`, `tags`, `date_posted`, `page`) or REST API fallback behavior.

## Decisions

- **Decision:** Change `params.set('sort_by', 'null')` to `params.set('sort_by', 'newest')` inside `ArbeitnowProvider.buildSearchUrl`.
  - *Rationale:* Passing `sort_by=newest` instructs Arbeitnow's web search endpoint to sort vacancies by newest posting date first.
  - *Alternatives considered:* Leaving `sort_by=null`, which yields default/relevance sorting instead of chronological newest-first sorting.

## Risks / Trade-offs

- **Risk:** Existing unit tests asserting search URL structure might break if they expect `sort_by=null` or `sort_by=relevance`.
  - *Mitigation:* Update unit test assertions in `src/__tests__/arbeitnowProvider.test.ts` to expect `sort_by=newest`.
