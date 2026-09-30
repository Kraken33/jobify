# Design

## Context

See `proposal.md` - Why.
`JustJoinProvider` uses Apify's `trev0n/justjoinit-scraper` actor to scrape JustJoin.it offers. Currently, search parameters are passed in a non-standard JSON body schema without building a canonical JustJoin search URL (`startUrls`), and HTTP logging hides the payload in `/logs`. Furthermore, update scans erase the timestamp cursor when zero new items are found, and the fallback generator is locked to 3 items per scan.

## Goals / Non-Goals

**Goals:**
- Implement `buildSearchUrl(criteria)` to construct canonical JustJoin.it URLs (e.g. `https://justjoin.it/all-locations/javascript?keyword=Frontend&experience-level=senior&workplace-type=remote`).
- Send `startUrls: [searchUrl]`, `limit: requestedLimit`, `keyword`, and `experience` to the Apify scraper payload.
- Make target search queries transparently visible in `/logs` by appending target query metadata to the logged fetch endpoint URL.
- Preserve `criteria.publishedAtCursor` in `normalizeApifyDataset` when zero new postings are found during delta scans.
- Allow `getSampleFallbackListings` to return up to `criteria.limit` listings (matching Arbeitnow's flexible batch size).

**Non-Goals:**
- Replacing Apify with direct web scraping of JustJoin.it (JustJoin.it uses heavy Cloudflare protections that require Apify or headless browser proxies).
- Changing candidate fit matching or AI scoring logic.

## Decisions

### 1. Canonical JustJoin Search URL Generation (`buildSearchUrl`)
- **Rationale**: JustJoin.it's web application filters offers reliably via URL paths and query parameters. By building a canonical URL and passing it via `startUrls`, the Apify actor navigates directly to the filtered JustJoin listing page.
- **URL Structure**:
  - Base: `https://justjoin.it/{locationSlug}/all` (e.g., `https://justjoin.it/all-locations/all` or `https://justjoin.it/warszawa/all`).
  - Query Params: `keyword` (role/keyword), `experience-level` (seniority), `workplace-type` (remote/hybrid/office). Defaulting the category path segment to `all` ensures searches cover all matching jobs across the entire board rather than narrowing to an inferred subset.
- **Alternatives Considered**: Passing only custom JSON fields to the actor without `startUrls`—rejected because the actor's internal filter mapping is fragile without an explicit target URL. Inferring technology category from skills—rejected in favor of `all` to avoid restricting multi-skill search queries.

### 2. Transparent Logging in HTTP Logger
- **Rationale**: Currently, `loggedFetch` records `https://api.apify.com/v2/acts/trev0n~justjoinit-scraper/run-sync-get-dataset-items?token=***`, hiding the search role and keywords in the POST body.
- **Approach**: Append the target query string to the Apify endpoint as a query parameter (e.g. `&searchUrl=${encodeURIComponent(targetSearchUrl)}` or `&query=${encodeURIComponent(targetKeyword)}`). The logger's `sanitizeUrl` will mask the token while preserving the search URL query in the `/logs` table.

### 3. Cursor Preservation on Delta Scans
- **Rationale**: When an incremental update scan is executed and 0 new postings match `publishedAt > cursorTime`, returning `nextCursor: null` destroys the session's checkpoint and forces future scans into full rescans.
- **Approach**: `nextCursor: { publishedAtCursor: newestPublishedAt || criteria.publishedAtCursor }`.

### 4. Batch Limit in Fallback Generator
- **Rationale**: If the user configures a batch size of 20 or 50, the fallback pool should provide matching batch volume instead of capping at 3 items.
- **Approach**: Calculate `pageSize = Math.min(criteria.limit || 20, 50)` and slice/cycle the fallback job pool accordingly.

## Risks / Trade-offs

- **[Risk]** Apify actor runtime duration for large batch limits.
  - **Mitigation**: Cap requested `limit` to `APIFY_MAX_ITEMS` (100) and default to 25.
- **[Risk]** JustJoin category slug mapping mismatch for unknown skills.
  - **Mitigation**: Default to `all-locations` and `all` (or omit category) when the skill does not map cleanly to a known JustJoin slug.
