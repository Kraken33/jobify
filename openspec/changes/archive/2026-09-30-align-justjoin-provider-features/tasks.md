# Tasks

## 1. Search URL and Payload Builder

- [x] 1.1 Implement `buildSearchUrl` in `JustJoinProvider.ts` to construct canonical JustJoin URLs (e.g. `https://justjoin.it/[location]/[category]?keyword=...&experience-level=...&workplace-type=...`) and verify with unit tests.
- [x] 1.2 Update `buildApifyInput` in `JustJoinProvider.ts` to pass `startUrls: [searchUrl]`, `limit: criteria.limit`, `keyword`, and string `experience`, and verify input payload formatting.

## 2. Request Logging and Cursor Management

- [x] 2.1 Update `fetchApifyOffers` in `JustJoinProvider.ts` to append target query metadata to the logged fetch endpoint URL so search parameters are transparently visible in `/logs`.
- [x] 2.2 Update `normalizeApifyDataset` in `JustJoinProvider.ts` to retain `criteria.publishedAtCursor` when zero new postings are found during delta scans, and verify cursor preservation.

## 3. Fallback Generator and Verification

- [x] 3.1 Update `getSampleFallbackListings` in `JustJoinProvider.ts` to generate listings up to `criteria.limit` (matching requested batch size) instead of a fixed 3 items.
- [x] 3.2 Update `src/__tests__/justJoinProvider.test.ts` with test cases for URL construction, Apify payload serialization, cursor preservation on 0 matches, and fallback limit sizing, and verify all tests pass via `npm test`.
