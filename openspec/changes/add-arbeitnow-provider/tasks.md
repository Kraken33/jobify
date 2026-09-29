# Tasks

## 1. Type Definitions & Provider Framework Updates

- [x] 1.1 Add `'arbeitnow'` provider key to types in `src/types/index.ts` and verify build compiles
- [x] 1.2 Implement `arbeitnowFallbackPool.ts` in `src/lib/providers/` generating mock Arbeitnow listings for offline fallback and unit test validation

## 2. Arbeitnow Provider Core Implementation

- [x] 2.1 Create `ArbeitnowProvider.ts` in `src/lib/providers/` implementing `BaseJobProvider` to fetch `https://www.arbeitnow.com/api/job-board-api` and normalize jobs into unified `JobListing` objects
- [x] 2.2 Implement spoken language and CEFR level extraction for Arbeitnow listings from description HTML and skill tags
- [x] 2.3 Implement `publishedAtCursor` timestamp filtering based on UNIX `created_at` timestamp for incremental search sessions
- [x] 2.4 Implement `getJobCount` method on `ArbeitnowProvider` returning `meta.total` count from Arbeitnow API
- [x] 2.5 Register `ArbeitnowProvider` instance in `ProviderRegistry` in `src/lib/providers/index.ts`

## 3. UI Integration & Verification

- [x] 3.1 Update UI search components (e.g. `SearchFilters`) to include Arbeitnow in provider selection checkboxes and options
- [x] 3.2 Add unit tests for `ArbeitnowProvider` in `src/__tests__/ArbeitnowProvider.test.ts` covering live API response mapping, spoken language extraction, cursor filtering, and fallback pool execution
- [x] 3.3 Execute test suite (`npm test`) and verify all tests pass
