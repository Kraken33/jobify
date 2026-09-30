# Tasks

## 1. Applied Matches Deduplication

- [x] 1.1 Add deduplication logic in `loadAppliedMatches()` in `src/lib/storage/matchStorage.ts` to ensure duplicate rows for the same `provider_job_id` are returned as a single unique match result.
- [x] 1.2 Write unit tests in `src/__tests__/matchStorage.test.ts` verifying that `loadAppliedMatches()` deduplicates duplicate database rows by `provider_job_id`.

## 2. Scan Flow Persistence Streamlining

- [x] 2.1 Remove redundant `saveSessionMatches` invocation on scan completion in `src/app/page.tsx` since `/api/match` handles persistence.
- [x] 2.2 Verify scan flow tests in `src/__tests__/scanFlowState.test.ts` and ensure full test suite passes with `npm run test`.
