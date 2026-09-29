# Design

## Context

See `proposal.md` for background and motivation.

Currently:
1. `ArbeitnowProvider.hasSearchTerms` only evaluated `criteria.keywords`, `criteria.skills`, and `criteria.spokenLanguages`. When a user selected an endpoint mode (such as "English only") without explicit keywords, `hasSearchTerms` returned `false`, triggering fallback to the REST API (`/api/job-board-api`) which ignores endpoint paths and tags.
2. `ArbeitnowProvider.buildSearchUrl` formatted URLs with `sort_by=relevance` and omitted `date_posted=all`, deviating from the working Arbeitnow web search parameters.
3. Providers (`ArbeitnowProvider`, `JustJoinProvider`, `ArbeitsagenturProvider`) were pulling from `criteria.skills` to construct board search keyword parameters. Sending skills into board-level search queries creates overly narrow keyword searches before candidates reach the LLM evaluation stage.
4. API routes (`/api/match` and `/api/session/count`) did not consistently pass `spokenLanguages`, `targetRole`, and `providerHints` to `searchJobs` and `getJobCount`.

## Goals / Non-Goals

**Goals:**
- Formulate Arbeitnow web search requests using the exact endpoint, tag, and query parameter structure (`https://www.arbeitnow.com/{endpoint}?search={role}&tags={tagsJson}&sort_by=null&date_posted=all&page={page}`).
- Treat endpoint hints and language filters as active search terms in `hasSearchTerms`.
- Transition all provider board queries to use the Target Job Title (`targetRole` / keywords) rather than candidate skills.
- Keep candidate skills strictly within LLM evaluation (`AiMatcherService`) and hard/soft pre-filtering.
- Ensure end-to-end propagation of `targetRole`, `spokenLanguages`, and `providerHints` through `SearchSession` and API routes.

**Non-Goals:**
- Modifying how the AI matcher uses candidate skills during fit evaluation.
- Altering JustJoin Apify scraping actors or Arbeitsagentur REST API authentication tokens.

## Decisions

### 1. Keyword Resolution Priority: Target Job Title First, Exclude Skills
- **Choice**: In `SearchCriteria`, add `targetRole?: string`. Provider adapters (`ArbeitnowProvider`, `JustJoinProvider`, `ArbeitsagenturProvider`) resolve search keywords from `criteria.targetRole` or `criteria.keywords`. They will **not** fall back to `criteria.skills`.
- **Rationale**: Job board search bars are designed for role titles (e.g., "Full Stack Developer", "Backend Engineer") or free-text keywords, not comma-separated lists of technical skills. Skills are accurately matched during AI profile evaluation.
- **Alternatives considered**: Passing comma-separated skills in search queries. Rejected because job board search engines perform boolean AND / exact keyword matching on titles and descriptions, eliminating relevant jobs.

### 2. Arbeitnow URL Construction & Endpoint Hint Detection
- **Choice**:
  - `hasSearchTerms`: Return `true` if `criteria.targetRole`, `criteria.keywords`, `criteria.spokenLanguages`, or `criteria.providerHints?.arbeitnow?.endpoint` is present.
  - `buildSearchUrl`: Construct URL with:
    - Base path: `https://www.arbeitnow.com/${endpointPath}` if `endpointPath` is present, else `https://www.arbeitnow.com`.
    - `search`: `criteria.targetRole || criteria.keywords?.join(' ') || ''`.
    - `tags`: `JSON.stringify(Array.from(tagsSet))` when `tagsSet.size > 0` (e.g. `["english speaking"]` for `english-speaking-jobs`).
    - `sort_by`: `null` (literal string `"null"` or empty depending on param serialization, matching Arbeitnow's `sort_by=null`).
    - `date_posted`: `all`.
    - `page`: `${page}`.
- **Rationale**: Exactly mirrors the working Arbeitnow web search format specified in the requirement.

### 3. Session & Route Propagation
- **Choice**:
  - Update `SearchSession` to optionally store `targetRole`.
  - In `CreateSessionModal`, retain/inherit `targetRole` when creating tracks.
  - In `src/app/api/match/route.ts` and `src/app/api/session/count/route.ts`, forward `targetRole: session.targetRole || profile.targetRole`, `spokenLanguages: session.spokenLanguages`, and `providerHints` into provider calls.
- **Rationale**: Guarantees consistency between batch scan matching and vacancy count queries across all providers.

## Risks / Trade-offs

- **[Risk]** When neither `targetRole` nor `keywords` are supplied, the search query parameter is empty.
  - **Mitigation**: Arbeitnow and JustJoin handle empty search queries by returning all recent listings for the selected endpoint/category/location, which is valid browsing behavior.
- **[Risk]** Existing sessions stored in localStorage or database without `targetRole`.
  - **Mitigation**: Fall back gracefully to `session.name` (stripping track suffixes if applicable) or `profile.targetRole`.
