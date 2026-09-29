# Tasks

## 1. Arbeitnow Provider Total Count Extraction Fix

- [x] 1.1 Update `parseTotalCountFromHtml` in `src/lib/providers/ArbeitnowProvider.ts` to parse the embedded script `let data = {...}` JSON payload and extract `data.total` (or `data.last_page * data.per_page`). Verify logic with inline checks.
- [x] 1.2 Update DOM regex fallback matching in `parseTotalCountFromHtml` to prevent page numbers like `"Showing 1 of 12 pages"` from being extracted as total vacancy counts.
- [x] 1.3 Add unit test cases in `src/__tests__/arbeitnowProvider.test.ts` covering HTML search pages with embedded script `let data = {...}` JSON payloads and verifying accurate total vacancy count parsing.
- [x] 1.4 Run unit test suite `npm test -- src/__tests__/arbeitnowProvider.test.ts` and verify all tests pass cleanly.
