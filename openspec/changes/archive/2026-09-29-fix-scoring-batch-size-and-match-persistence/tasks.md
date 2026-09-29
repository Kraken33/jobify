# Tasks

## 1. Provider Listing Pass-Through & Multi-Page Pagination

- [x] 1.1 In `src/lib/providers/ArbeitnowProvider.ts`, ensure all parsed job listings from the search page are returned without premature dropping, so non-matching vacancies reach the matching engine for low-match scoring.
- [x] 1.2 In `src/lib/providers/ArbeitnowProvider.ts`, implement multi-page fetching when requested `limit` exceeds single-page yields and advance the page cursor across consecutive scans.

## 2. Dynamic Batch Evaluation in Matching Engine

- [x] 2.1 In `src/app/api/match/route.ts`, evaluate all eligible jobs up to `maxScanLimit` with OpenAI, and assign all constraint-failing jobs synthetic 25% low-match evaluations without LLM calls.
- [x] 2.2 In `src/app/api/match/route.ts`, track all processed job IDs in `newlyScoredIds` so seen sets and cursors advance accurately.

## 3. Resilient Match Persistence & Query Deduplication

- [x] 3.1 In `src/app/api/match/route.ts` and `src/lib/storage/matchStorage.ts`, implement safe upsert with multi-row insert fallback so matches reliably persist in Supabase across all environments.
- [x] 3.2 In `src/lib/storage/matchStorage.ts`, ensure `loadSessionMatches()` deduplicates loaded match rows by `provider_job_id` so reloads never display duplicate vacancies.
- [x] 3.3 In `src/app/page.tsx`, ensure client-side state handling and scan response processing append matches cleanly.

## 4. Test Suite & Build Verification

- [x] 4.1 Update and run provider and session management tests in `src/__tests__/sessionManagement.test.ts` and `src/__tests__/ArbeitnowProvider.test.ts`. Run `npm run test`.
- [x] 4.2 Run `npm run build` to verify zero TypeScript errors and a clean production build.
