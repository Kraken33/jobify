# Tasks: Apify JustJoin.it Scraper with Client BYOK Token

## 1. Storage & Types: Apify Token Utilities

- [x] 1.1 Extend `src/types/index.ts` to add optional `apifyToken?: string` to `SearchCriteria`. Verify `npx tsc --noEmit` succeeds.
- [x] 1.2 Extend `src/lib/storage/apiKeyStorage.ts` to add helpers: `getStoredApifyToken()`, `setStoredApifyToken(token: string)`, `clearStoredApifyToken()`, `isValidApifyTokenFormat(token: string)`, and `getMaskedApifyToken()`. Verify format helper accepts valid `apify_api_...` strings.
- [x] 1.3 Add unit tests in `src/__tests__/apiKeyStorage.test.ts` verifying Apify token formatting, masking, and validation logic. Run `npm test` and verify all tests pass.

## 2. UI: ApiKeyModal & Header Integration

- [x] 2.1 Update `src/components/ApiKeyModal.tsx` to support configuring both the OpenAI API Key and the Apify API Token (with input validation, show/hide toggle, and clear action for each). Verify the modal compiles cleanly.
- [x] 2.2 Update `src/components/Navbar.tsx` to reflect active status for both keys (e.g. OpenAI and Apify badges or combined status). Verify visual indicators update when tokens are set or cleared.
- [x] 2.3 Update `src/app/page.tsx` to retrieve `getStoredApifyToken()` and include `X-Apify-Token` in headers sent to `/api/match`. Verify scanning sends the header when configured.

## 3. Ingestion & Matching Layer: Apify Scraper Integration

- [x] 3.1 Update `src/app/api/match/route.ts` to extract `X-Apify-Token` header and pass `apifyToken` into `provider.searchJobs(criteria)`. Verify with a mock request that `apifyToken` reaches the provider.
- [x] 3.2 Implement Apify `trev0n/justjoinit-scraper` invocation in `src/lib/providers/JustJoinProvider.ts` (or dedicated sub-adapter): serialize criteria into actor input (keyword, category, experienceLevel, workplaceType, location, maxItems, sortBy: 'published'), call `POST https://api.apify.com/v2/acts/trev0n~justjoinit-scraper/run-sync-get-dataset-items`, and parse output items.
- [x] 3.3 Implement dataset item normalization in `JustJoinProvider.ts` to map Apify fields (`jobTitle`, `company`, `salary`, `workplace`, `experience`, `requiredSkills`, `jobUrl`, `published`, `description`) into canonical `JobListing`, respecting `publishedAtCursor` filtering and deduplication.
- [x] 3.4 Wire graceful degradation: if no `apifyToken` is provided, or if the Apify run returns 401/402 or network error, log a warning and return the deterministic multi-page fallback pool with `fallback: true`.
- [x] 3.5 Add unit tests in `src/__tests__/justJoinProvider.test.ts` for Apify payload normalization, date cursor filtering, and error fallback behavior. Run `npm test` and verify all pass.
