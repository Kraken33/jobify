# Proposal: Paginate Arbeitnow Provider Batch Scan

## Why

When scanning job listings via the Arbeitnow provider adapter, requests strictly return a maximum of 35 vacancies even when a higher Prefetch Batch Size (e.g. 50, 70, or 100) is specified in search criteria or UI controls. This happens because the adapter issues a single REST API query (`fetchApiPage(1)` returning 35 items) or uses a fixed page count limit in web search mode. Adding pagination for both REST API fetching and web search scraping ensures Arbeitnow respects candidate prefetch batch limits cleanly.

## What Changes

- Modify `ArbeitnowProvider` to dynamically calculate the required page count based on `criteria.limit` (Prefetch Batch Size) and page sizes (35 for REST API, ~25 for web search).
- Implement a multi-page pagination loop in `fetchLiveJobs` for REST API queries when `criteria.limit` exceeds 35 items (or when accumulating job listings across pages).
- Dynamically scale web search scraping pages in `fetchLiveJobs` according to `criteria.limit`.
- Truncate accumulated, filtered, and sorted job listings to match `criteria.limit`.
- Enforce a maximum safety limit of 5 pages (up to 175 raw postings) to guard against runaway HTTP requests.

## Capabilities

### New Capabilities

*(None)*

### Modified Capabilities

- `job-provider-ingestion`: Update Arbeitnow provider specifications to require multi-page REST API fetching and dynamic web search pagination when `criteria.limit` exceeds single-page yields.

## Impact

- `src/lib/providers/ArbeitnowProvider.ts`: Implementation of multi-page API and web search pagination loop logic.
- `src/__tests__/arbeitnowProvider.test.ts`: Added unit tests verifying multi-page API pagination when `limit > 35`.
- End-to-end match scans for Arbeitnow sessions with prefetch batch sizes up to 100 will now return up to the full batch count.
