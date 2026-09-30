# Technical Design: Paginate Arbeitnow Provider Batch Scan

## Context

`ArbeitnowProvider` fetches jobs via two pathways:
1. **Web Search Scraping**: Activated when criteria contain target role, keywords, or language criteria. Currently attempts scraping up to 3 pages max (`maxPagesToFetch = 3`).
2. **REST API Queries**: Fallback or default mode when search terms are omitted. Issues a single call to `fetchApiPage(1)`, which returns at most 35 postings (`meta.per_page = 35`).

When candidate search criteria specify a higher prefetch batch limit (e.g. `limit: 50` or `100`), REST API queries currently stop after page 1, returning at most 35 items.

## Goals / Non-Goals

**Goals:**
- Dynamically calculate `maxPagesToFetch` based on `criteria.limit` (Prefetch Batch Size) for both REST API queries and web search scraping.
- Implement a multi-page loop for REST API queries (`fetchApiPage(page)`) when `criteria.limit > 35`.
- Aggregate items across pages, normalize, deduplicate, filter by cursor/seen items, and truncate the final listing array to `criteria.limit`.
- Enforce a max safety ceiling of 5 pages (up to 175 raw items) to prevent runaway fetch loops.

**Non-Goals:**
- Modifying Arbeitnow API response schemas or web search DOM parser.
- Changing `SearchCriteria` interfaces or dropdown preset options in `MatchesBoard.tsx`.

## Decisions

### 1. Dynamic Page Ceiling Calculation
- Calculate `targetLimit = Math.max(1, Math.min(100, criteria.limit || 20))`.
- For REST API mode: `maxPagesToFetch = Math.max(1, Math.min(5, Math.ceil(targetLimit / 35)))`.
- For Web Search mode: `maxPagesToFetch = Math.max(1, Math.min(5, Math.ceil(targetLimit / 25)))`.
- *Rationale*: REST API pages return up to 35 items; web search pages return 25-35 items before deduplication. A 5-page ceiling safely covers target limits up to 100 listings (35 * 3 = 105; 35 * 5 = 175).

### 2. Multi-Page Accumulation in REST API Mode
- Loop `page = 1..maxPagesToFetch`:
  - Execute `payload = await this.fetchApiPage(page)`.
  - Append `payload.data` items to `accumulatedItems`.
  - Check `hasNextPage = Boolean(payload?.links?.next) || (payload?.meta?.current_page * payload?.meta?.per_page < payload?.meta?.total)`.
  - Break early if `!hasNextPage` or `items.length === 0` or `accumulatedItems.length >= targetLimit`.
- Pass `{ data: accumulatedItems }` to `normalizeApiResponse`.
- *Alternative Considered*: Modifying `normalizeApiResponse` signature to accept an array of payloads. *Rejected*: Passing a unified envelope `{ data: accumulatedItems }` preserves backward compatibility with unit tests.

### 3. Truncating Final Output
- In `fetchLiveJobs`, after sorting listings newest-first and applying `publishedAtCursor` / `seenJobIds` filtering, truncate the result array: `filtered = filtered.slice(0, targetLimit)`.
- *Rationale*: Guarantees the adapter returns at most `criteria.limit` listings to downstream matching engines.

## Risks / Trade-offs

- **[Risk] Increased network request latency for batch sizes > 35** → *Mitigation*: Sequential page requests inherit 15s per-request timeout. The loop breaks early as soon as `targetLimit` items are collected.
- **[Risk] REST API page exhaustion** → *Mitigation*: The loop checks `links.next` and `meta.current_page < meta.last_page` to stop cleanly when no additional pages are available.
