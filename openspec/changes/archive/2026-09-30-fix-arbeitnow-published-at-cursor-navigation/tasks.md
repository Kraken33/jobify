# Tasks

## 1. Implement HTML Datetime Parsing and Boundary-Aware Pagination in ArbeitnowProvider

- [x] 1.1 In `src/lib/providers/ArbeitnowProvider.ts`, update `parseWebSearchHtml` to extract `<time datetime="...">` and parse it into an ISO `publishedAt` timestamp with fallback to `new Date().toISOString()`.
- [x] 1.2 In `src/lib/providers/ArbeitnowProvider.ts`, update `fetchLiveJobs` multi-page loop to support exact limit batch accumulation for initial scans, and boundary-aware early termination on `publishedAt <= cursorTime` or `seenJobIds` for delta update scans.
- [x] 1.3 In `src/lib/providers/ArbeitnowProvider.ts`, ensure `nextCursor` preserves existing `publishedAtCursor` when no new postings are returned from live search.

## 2. Testing and Validation

- [x] 2.1 Update unit tests in `src/__tests__/arbeitnowProvider.test.ts` to test `<time datetime="...">` HTML parsing, initial batch multi-page fetching up to limit, and delta update boundary early termination.
- [x] 2.2 Run test suite via `npm test` and verify all tests pass without regressions.
