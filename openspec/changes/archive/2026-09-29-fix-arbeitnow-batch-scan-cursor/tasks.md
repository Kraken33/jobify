# Tasks

## 1. Arbeitnow Provider Cursor Refactoring

- [x] 1.1 Update `ArbeitnowProvider.fetchLiveJobs` in `src/lib/providers/ArbeitnowProvider.ts` to remove `page:N` cursor incrementation, start web search scans from Page 1, and generate ISO timestamp `nextCursor` (`publishedAtCursor`). Verify unit tests run via `npm test`.
- [x] 1.2 Update unit tests in `src/__tests__/arbeitnowProvider.test.ts` to assert ISO timestamp `nextCursor` behavior instead of `page:3`. Verify all Arbeitnow tests pass cleanly via `npm test`.

## 2. Verification

- [x] 2.1 Run full test suite (`npm test`) to ensure no regressions across provider adapters or match route integration tests.
