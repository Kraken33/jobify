# Proposal

## Why

Currently, when scanning batch with Arbeitnow via web search, `ArbeitnowProvider` sets `nextCursor` to a page-based string (e.g., `page:2`, `page:3`). Because Arbeitnow web search is sorted newest-first (`sort_by=newest`), `page=1` contains the newest vacancies, while subsequent pages (`page=2`, `page=3`) contain older historical vacancies.

On subsequent batch scans, `ArbeitnowProvider` reads `publishedAtCursor: "page:2"`, skips Page 1 entirely, and fetches Page 2 to evaluate older postings. This causes the app to evaluate older jobs and display `"Successfully evaluated 5 new positions!"` even though they are older historical positions, while missing any new positions published on Page 1 since the last scan.

Fixing this aligns Arbeitnow with the standardized provider contract (used by `JustJoin` and `Arbeitsagentur`), where cursors use the ISO timestamp of the newest published job (`publishedAtCursor`) combined with `seenJobIds` deduplication, starting delta scans from Page 1 to detect truly new vacancies.

## What Changes

- **Update Cursor Strategy in `ArbeitnowProvider`**:
  - Replace page-based cursor generation (`page:N`) with ISO publication timestamp cursor generation (`newestPublishedAt`) matching the standardized provider contract.
  - On incremental scans, start fetching from Page 1 to inspect newly posted vacancies.
  - Apply timestamp filtering (`publishedAt > publishedAtCursor`) alongside `seenJobIds` deduplication across web search and API results.
- **Accurate Zero-New-Positions Notice**:
  - When no new vacancies published after `publishedAtCursor` are found on Page 1 (or all listings are already in `seenJobIds`), return `0` new listings so the system displays *"No new postings since your last scan."*

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `job-provider-ingestion`: Update Requirement 4 for Arbeitnow provider cursor pagination to mandate ISO timestamp-based cursors (`publishedAtCursor`) instead of page incrementation, starting delta scans from Page 1 to fetch only newer vacancies.

## Impact

- `src/lib/providers/ArbeitnowProvider.ts`: Modified `fetchLiveJobs` cursor handling and page resolution logic.
- `src/__tests__/arbeitnowProvider.test.ts`: Updated unit tests asserting cursor behavior.
- `src/app/api/match/route.ts`: Remains fully compatible as it already consumes ISO timestamp `publishedAtCursor`.
