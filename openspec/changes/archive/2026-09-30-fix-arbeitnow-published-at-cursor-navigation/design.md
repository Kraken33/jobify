# Design

## Context

See `proposal.md` for motivation. Currently, `parseWebSearchHtml` in `src/lib/providers/ArbeitnowProvider.ts` creates each `JobListing` with `publishedAt: new Date().toISOString()`. In addition, `fetchLiveJobs` attempts to collect `targetLimit` (e.g. 100 on updates) items across pages 1..5 before filtering against `publishedAtCursor` and `seenJobIds`. Because every scraped listing receives a synthetic timestamp of "now", all listings from pages 1, 2, 3, 4 pass `publishedAt > cursorTime`, causing dozens of historical postings from older pages to be scored as "new".

## Goals / Non-Goals

**Goals:**
- Parse the real ISO publication date from `<time datetime="...">` inside each Arbeitnow vacancy card.
- In **Initial Batch mode** (`publishedAtCursor` is null), sequentially scrape pages 1..N until the accumulated unique listings reach the requested `criteria.limit` (Prefetch Batch Size) or no further pages exist.
- In **Update mode** (`publishedAtCursor` is present), scrape newest-first starting from Page 1, collecting only postings with `publishedAt > publishedAtCursor` and `!seenJobIds.has(id)`, terminating crawling immediately once an item at/before cursor or in `seenJobIds` is reached.
- Preserve cursor state when 0 new items are found.

**Non-Goals:**
- Modifying JustJoin or Arbeitsagentur provider adapters (they already follow ISO timestamp cursor contracts).
- Changing AI matcher prompt structures or scoring algorithms.

## Decisions

### Decision 1: Extract `<time datetime="...">` in `parseWebSearchHtml`
- **Choice:** Use a regular expression matching `<time[^>]*datetime="([^"]+)"` within each job chunk.
- **Rationale:** Arbeitnow HTML includes `<p title="Posted X ago"><time datetime="YYYY-MM-DD HH:mm:ss">X</time></p>`. Parsing this timestamp guarantees accurate ISO strings for sorting, comparison, and cursor tracking.
- **Alternatives Considered:**
  - *Keep synthetic timestamps and track page numbers:* Rejected because page numbers become stale and miss newly published jobs on Page 1.
  - *Query REST API for exact dates:* Rejected because the REST API is unindexed/unfiltered and cannot search by target roles and tags like web search does.

### Decision 2: Distinct Multi-Page Loop Strategies for Initial Batch vs Update
- **Choice:**
  - *Initial Batch Scan (`!publishedAtCursor`):* Iterate `currentPage = 1..maxPages` while `accumulatedListings.length < targetLimit`.
  - *Update Scan (`publishedAtCursor`):* Iterate `currentPage = 1..maxPages`. For each page, iterate listings newest-first. If a listing is newer than `publishedAtCursor` and unseen, collect it. If a listing is `< = publishedAtCursor` or in `seenJobIds`, set `hitBoundary = true` and break out of the page and loop.
- **Rationale:** Prevents making superfluous HTTP requests for pages 2, 3, 4 when Page 1 already reached known postings, while allowing multi-page fetching when a large influx of new postings actually spans multiple pages.
- **Alternatives Considered:**
  - *Always restrict Update scans to Page 1:* Flawed if > 35 new positions were published since the last scan. The boundary-aware approach seamlessly handles both small and large updates.

## Risks / Trade-offs

- **[Risk] DOM structure changes on Arbeitnow**: If Arbeitnow modifies the `<time datetime="...">` HTML attribute.
  - *Mitigation:* Fall back gracefully to `new Date().toISOString()` if `<time>` tag is absent in an individual chunk, preventing parser crashes.

## Migration Plan

- No database migrations or schema adjustments required.
- Changes are fully backwards-compatible with existing search sessions and checkpoints.
