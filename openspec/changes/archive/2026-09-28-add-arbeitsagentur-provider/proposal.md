# Proposal

## Why

Jobify currently queries JustJoin.it (via Apify) as its sole job provider. To broaden search opportunities in the DACH (Germany, Austria, Switzerland) region without requiring paid scraping subscriptions, Jobify needs an integration with the official German Federal Employment Agency (**Bundesagentur für Arbeit** / `arbeitsagentur.de`). The Arbeitsagentur maintains an open, public REST API (`jobsuche-service`) with zero subscription or token cost (`X-API-Key: jobboerse-jobsuche`), directly queryable from our Node.js backend. Integrating this provider unlocks thousands of European tech positions with structured compensation, remote work tags, and direct application links at zero marginal API cost.

## What Changes

- Add a new `ArbeitsagenturProvider` implementing `BaseJobProvider` and register it in `providerRegistry`.
- Query `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs` passing `X-API-Key: jobboerse-jobsuche` with criteria mappings (role/skills to `was`, location to `wo`, remote/home office filtering).
- Normalize Arbeitsagentur jobs into standard `JobListing` domain models with company name, title, EUR salary ranges, publication timestamps, and external URLs.
- Support stateful cursor pagination using publication dates and page offsets with deduplication.
- Widen a located search once (dropping `wo`) when the board returns no posting usable for the requested work mode, and surface the relaxation as a scan notice instead of dead-ending the scan.
- Provide a deterministic multi-page fallback pool if the service times out or network is offline.
- Extend `JobListing.provider` union to include `'arbeitsagentur'`.
- Update session creation and scanning UI so users can select between JustJoin.it and Arbeitsagentur when configuring search tracks.
- Update `/api/match` and scanning triggers to dynamically dispatch to the session's chosen provider.

## Capabilities

### Modified Capabilities
- `job-provider-ingestion`: Add Arbeitsagentur provider integration requirements and normalization specifications alongside JustJoin.it.
- `search-sessions`: Allow search tracks to specify and persist the target job provider (`justjoin` or `arbeitsagentur`) and route scans to the respective provider.

## Impact

- `src/types/index.ts`: Update `JobListing.provider` type union (`'justjoin' | 'arbeitsagentur' | 'linkedin' | 'custom'`).
- `src/lib/providers/ArbeitsagenturProvider.ts`: New provider adapter class.
- `src/lib/providers/index.ts`: Register `ArbeitsagenturProvider`.
- `src/components/CreateSessionModal.tsx`: Add provider selection dropdown (`JustJoin.it` vs `Bundesagentur für Arbeit`).
- `src/app/page.tsx`: Dynamically pass active session's provider ID into `/api/match` and surface provider scan notices in the feedback banner.
- `src/app/api/match/route.ts`: Propagate `ProviderResult.notice` and report a genuinely empty provider response with an accurate message instead of the baseline-constraint copy.
- `src/__tests__/arbeitsagenturProvider.test.ts`: Unit and integration test coverage.
