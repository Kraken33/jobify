# Proposal: Use Apify trev0n/justjoinit-scraper with Client BYOK Token

## Why

JustJoin.it's direct API endpoint (`https://api.justjoin.it/v2/user-panel/offers`) is now protected by Cloudflare Bot Management and returns `HTTP 503` when called directly from application servers, causing the ingestion system to fail and repeatedly fall back to mock data. To reliably scrape live job listings from JustJoin.it without running into Cloudflare blocking, we can use the proven Apify actor `trev0n/justjoinit-scraper`. Using a client Bring-Your-Own-Key (BYOK) model for the Apify API token (Option A) maintains our zero-server-cost architecture, preserves candidate privacy, and aligns directly with the existing client BYOK pattern already used for OpenAI API keys.

## What Changes

- Add client-side storage, state management, and validation for an Apify API token (`jobify_apify_api_token`) alongside the OpenAI API key.
- Update the API key settings UI (`ApiKeyModal`, `Navbar`) to allow candidates to input, view/mask, test, save, and clear their Apify API token.
- Update the client scan request to pass the Apify API token to `/api/match` via a dedicated request header (`X-Apify-Token`).
- Update `/api/match` to extract `X-Apify-Token` and forward it into the provider search criteria.
- Integrate the Apify actor `trev0n/justjoinit-scraper` via its synchronous execution API (`https://api.apify.com/v2/acts/trev0n~justjoinit-scraper/run-sync-get-dataset-items`) within the job provider layer.
- Map the Apify actor's output dataset items (`jobTitle`, `company`, `salary`, `experience`, `workplace`, `requiredSkills`, `jobUrl`, `published`, `description`) into the canonical `JobListing` structure, preserving cursor handling (`publishedAtCursor`) and deduplication.
- Retain the deterministic multi-page fallback pool when no Apify token is provided or when the Apify run encounters errors/depleted credits, surfacing explicit error or fallback notices to the user.

## Capabilities

### Modified Capabilities
- `job-provider-ingestion`: Update the JustJoin ingestion adapter to support querying via the Apify `trev0n/justjoinit-scraper` actor when an Apify token is supplied, translating search criteria into actor input parameters and normalizing actor dataset records into canonical `JobListing` objects.
- `job-matching-engine`: Extend the `/api/match` route and client scan workflow to pass and consume the `X-Apify-Token` header, routing it to the provider adapter while keeping structured matching, deduplication, and fallback mechanisms intact.

## Impact

- **UI / Client Components**: `ApiKeyModal.tsx` and `Navbar.tsx` updated to manage and display Apify token status alongside the OpenAI key. `src/app/page.tsx` updated to include `X-Apify-Token` header when making scan requests.
- **Client Storage**: `src/lib/storage/apiKeyStorage.ts` extended with helpers for Apify API token storage, retrieval, masking, and validation (`apify_api_...`).
- **Backend API**: `src/app/api/match/route.ts` updated to receive `X-Apify-Token` and pass it to provider criteria.
- **Provider Layer**: `src/lib/providers/JustJoinProvider.ts` (and/or dedicated Apify adapter) updated to call Apify synchronous run API, parse actor output schema, and gracefully fall back to the deterministic generator if token is missing or call fails.
- **Types**: `SearchCriteria` in `src/types/index.ts` extended with optional `apifyToken?: string`.
- **Dependencies**: No external dependencies strictly required (native `fetch` works with Apify REST API), or optional lightweight `apify-client` if preferred.
