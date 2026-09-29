# Tasks

## 1. Implement sort_by=newest in ArbeitnowProvider

- [x] 1.1 Update `ArbeitnowProvider.buildSearchUrl` in `src/lib/providers/ArbeitnowProvider.ts` to set `params.set('sort_by', 'newest')` instead of `params.set('sort_by', 'null')`
- [x] 1.2 Update unit test assertions in `src/__tests__/arbeitnowProvider.test.ts` to check that `buildSearchUrl` produces URLs containing `sort_by=newest` and run tests via `npm test -- arbeitnowProvider.test.ts` to verify they pass
