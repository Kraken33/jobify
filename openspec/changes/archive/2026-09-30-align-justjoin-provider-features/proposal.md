# Proposal

## Why

JustJoin.it ingestion currently triggers Apify scraper runs with generic parameters in the hidden POST body, omitting explicit JustJoin search URLs (`startUrls`), keyword/experience alignments, and transparent logging in `/logs`. Additionally, delta update scans drop the published cursor when zero new items are returned, and fallback demo mode is restricted to a fixed 3 items regardless of the requested batch limit. Aligning JustJoin.it with Arbeitnow's battle-tested search URL generation, delta cursor boundary retention, transparent request logging, and flexible batch pagination fixes these inaccuracies.

## What Changes

- **Canonical Search URL Generator (`buildSearchUrl`)**: Add a method on `JustJoinProvider` to construct canonical JustJoin search URLs (e.g. `https://justjoin.it/[location]/[category]?keyword=[keyword]&experience-level=[seniority]`) and pass them via `startUrls` to the Apify scraper payload.
- **Actor Payload Alignment**: Correct the Apify scraper input schema by sending `limit` (replacing `maxItems`), `startUrls`, `keyword`, and string `experience` fields.
- **Transparent Logging**: Pass the targeted JustJoin search URL as part of the logged request so search parameters, keywords, and filters are immediately visible and inspectable in the `/logs` interface.
- **Cursor Retention on Delta Scans**: Preserve `criteria.publishedAtCursor` when no new vacancies are found in an update scan, preventing cursor loss and redundant full scans.
- **Batch Limit in Fallback Generator**: Update `getSampleFallbackListings` to return up to `criteria.limit` listings (matching Arbeitnow's behavior) instead of capping at a fixed 3 items.

## Capabilities

### Modified Capabilities
- `job-provider-ingestion`: Update JustJoin.it provider ingestion requirements to specify canonical search URL generation (`buildSearchUrl` / `startUrls`), corrected scraper input schema, transparent request logging, cursor retention during delta scans, and dynamic limit support in fallback mode.

## Impact

- `src/lib/providers/JustJoinProvider.ts`: Implementation of `buildSearchUrl`, corrected Apify payload, delta cursor retention, and fallback limit handling.
- `src/__tests__/justJoinProvider.test.ts`: Unit test suite updates covering `buildSearchUrl`, `startUrls` serialization, delta cursor preservation, and fallback batch sizing.
- HTTP Request logging: `/logs` UI now reflects targeted JustJoin queries with full parameters.
