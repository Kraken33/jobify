# Proposal

## Why

When users click "Update" on an existing search track using the Arbeitnow provider, the application currently evaluates dozens of older historical vacancies instead of only newly posted positions. This occurs because the HTML scraper stamps every parsed listing with the current execution time (`new Date().toISOString()`) instead of parsing the actual posting datetime from the listing HTML (`<time datetime="...">`), and the multi-page fetch loop continues requesting older pages (page 2, 3, 4) regardless of whether the scan has crossed the previous scan's boundary.

## What Changes

- **Parse Real Publication Datetimes from HTML**: Extract `<time datetime="...">` inside each vacancy card in `parseWebSearchHtml` to establish accurate `publishedAt` ISO timestamps instead of synthetic `new Date().toISOString()`.
- **Enforce Prefetch Batch Size on Initial Scans**: When performing an initial batch scan (`publishedAtCursor` is null/empty), sequentially fetch pages 1..N until the accumulated, deduplicated listing count reaches the configured `criteria.limit` (Prefetch Batch Size) or no further pages exist.
- **Enforce Boundary-Aware Early Termination on Update Scans**: In delta/update mode (`criteria.publishedAtCursor` is present), scan newest-first starting at Page 1. Retain only postings where `publishedAt > publishedAtCursor` and not in `seenJobIds`. Terminate multi-page crawling immediately once a posting with `publishedAt <= publishedAtCursor` or an ID in `seenJobIds` is reached.
- **Preserve Cursor State When No New Postings Exist**: When an Update scan finds zero postings newer than `publishedAtCursor`, preserve the existing cursor and return zero matches so the UI correctly reports "You're up to date!".

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `job-provider-ingestion`: Update Arbeitnow provider requirements to mandate `<time datetime="...">` HTML parsing for `publishedAt` and boundary-aware early-exit pagination during delta update scans.

## Impact

- `src/lib/providers/ArbeitnowProvider.ts`: Updated `parseWebSearchHtml` regex and datetime parsing, and updated `fetchLiveJobs` multi-page loop to support exact limit batch accumulation and delta early termination.
- `src/__tests__/arbeitnowProvider.test.ts`: Added/updated unit tests verifying `<time datetime="...">` extraction and delta scan boundary termination.
- UI and OpenAI costs: Prevents unnecessary OpenAI evaluations of historical vacancies on "Update".
