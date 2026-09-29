# Proposal

## Why

Currently, `ArbeitnowProvider.parseTotalCountFromHtml` attempts to extract total matching vacancies from HTML search pages using simple text regular expressions (e.g., `Showing 1 of X`). On live Arbeitnow pages, the web UI relies on Alpine.js rendering, where DOM text contains page-level pagination indicators (e.g. `Showing 1 of 12 pages`) rather than plain-text vacancy totals. As a result, the existing regex captures the total **page count** (e.g. `12`) instead of the true total vacancy count.

Arbeitnow embeds a structured JSON pagination object directly in a `<script>` tag within the HTML payload (`let data = { ... "total": 235, "last_page": 12, "per_page": 35 }`). Updating `ArbeitnowProvider` to parse this embedded JSON state ensures Jobify v2 accurately reports total matching vacancies to the UI and sessions.

## What Changes

- **Update Arbeitnow vacancy count extraction**: Update `ArbeitnowProvider.parseTotalCountFromHtml` to first extract and parse the embedded JavaScript `let data = {...}` object from HTML search pages and read `data.total` (or compute `data.last_page * data.per_page` when `total` is unpopulated).
- **Fallback Regex Safeguards**: Retain DOM text regex matching as a secondary fallback, adjusting regex logic so page counts like `"Showing 1 of 12 pages"` are not misidentified as vacancy totals.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `job-provider-ingestion`: Update the requirement for Arbeitnow vacancy count querying to specify extracting `total` count from embedded page script metadata or calculating page product before falling back.

## Impact

- `src/lib/providers/ArbeitnowProvider.ts`: `parseTotalCountFromHtml` implementation updated.
- `src/__tests__/arbeitnowProvider.test.ts`: Added unit tests verifying script JSON extraction for total vacancy count.
- UI (`/api/session/count` & `MatchesBoard.tsx`): Displays accurate total vacancy numbers for Arbeitnow searches.
