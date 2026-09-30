# Tasks

## 1. Provider Adapter Pagination Implementation

- [x] 1.1 Update `ArbeitnowProvider.ts` to compute dynamic page ceilings for web search (`maxPagesToFetch = Math.max(3, Math.min(5, Math.ceil(targetLimit / 25)))`) and REST API fallback queries (`maxPagesToFetch = Math.max(1, Math.min(5, Math.ceil(targetLimit / 35)))`).
- [x] 1.2 Implement the multi-page REST API pagination loop in `fetchLiveJobs` to sequentially request `fetchApiPage(page)` up to `maxPagesToFetch`, accumulating raw items until `targetLimit` is reached or no further pages exist.
- [x] 1.3 Add output truncation in `fetchLiveJobs` to slice normalized listings array to `criteria.limit` (`filtered.slice(0, targetLimit)`).

## 2. Unit Testing & Verification

- [x] 2.1 Update `src/__tests__/arbeitnowProvider.test.ts` with test cases verifying multi-page REST API fetching when `criteria.limit > 35` (e.g. limit 50 fetching pages 1 & 2).
- [x] 2.2 Run unit test suite via `npm test -- src/__tests__/arbeitnowProvider.test.ts` to verify all tests pass cleanly.
