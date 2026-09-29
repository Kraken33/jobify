# Proposal

## Why

When users select "English only" for Arbeitnow or configure language filters, searches currently fail to use the specialized Arbeitnow endpoint and tags (`https://www.arbeitnow.com/english-speaking-jobs?search=&tags=%5B%22english+speaking%22%5D&sort_by=null&date_posted=all&page=1`) due to endpoint criteria not triggering web search mode and incorrect parameter formatting (`sort_by=relevance` instead of `sort_by=null&date_posted=all`, plus missing options in API route proxies). Additionally, job board provider queries were sending candidate skills into search keyword inputs rather than the Target Job Title (`targetRole`), causing over-constrained keyword searches at the provider level when skills should only be used during LLM/AI candidate fit evaluation.

## What Changes

- **Target Job Title in Provider Search**: Change provider search criteria resolution across all adapters (Arbeitnow, JustJoin, Arbeitsagentur) and API endpoints (`/api/match`, `/api/session/count`) so that provider search queries use Target Job Title / Role keywords rather than skills. Skills are reserved exclusively for AI/LLM evaluation and local hard/soft pre-filtering.
- **Arbeitnow Web Search Endpoint & Tags URL Format**: Fix `ArbeitnowProvider` URL construction and search execution:
  - Use the exact URL pattern `https://www.arbeitnow.com/{endpoint}?search={role}&tags={tagsJson}&sort_by=null&date_posted=all&page={page}`.
  - For English-only mode, target endpoint `english-speaking-jobs` with `tags=["english speaking"]`.
  - Ensure `hasSearchTerms` recognizes `providerHints.arbeitnow.endpoint` so selecting an endpoint mode triggers web search rather than prematurely falling back to the un-tagged REST API.
- **Route and Session Context Propagation**: Ensure `match/route.ts` and `session/count/route.ts` pass `targetRole`, `spokenLanguages`, and `providerHints` correctly from the active search session to provider adapters.
- **Session Entity Enrichment**: Add optional `targetRole` to `SearchSession` and `SearchCriteria` so search tracks explicitly retain target job titles when created from profile or custom input.

## Capabilities

### Modified Capabilities

- `job-provider-ingestion`: Update Arbeitnow search URL schema (including `sort_by=null&date_posted=all`, endpoint-specific paths, and JSON tags), update search trigger conditions to treat endpoint hints as active search terms, and specify that provider searches query on target job title rather than candidate skills.
- `search-sessions`: Ensure search sessions store and propagate `targetRole`, spoken languages, and provider options into provider search criteria.

## Impact

- `src/types/index.ts`: Add `targetRole` to `SearchCriteria` and `SearchSession`.
- `src/lib/providers/ArbeitnowProvider.ts`: Fix `buildSearchUrl`, `hasSearchTerms`, and query parameter handling.
- `src/lib/providers/JustJoinProvider.ts` & `src/lib/providers/ArbeitsagenturProvider.ts`: Resolve search keywords from `targetRole` / `keywords` instead of `skills`.
- `src/app/api/match/route.ts` & `src/app/api/session/count/route.ts`: Pass `targetRole`, `spokenLanguages`, and `providerHints` to `searchJobs` and `getJobCount`.
- `src/lib/storage/sessionStorage.ts`: Include `targetRole` in implicit and persisted sessions.
- `src/components/CreateSessionModal.tsx`: Include target role field / inheritance in session creation.
- `src/__tests__/arbeitnowProvider.test.ts` & related test suites: Update and add test coverage for Arbeitnow URL formatting, English tag mapping, and target role keyword resolution.
