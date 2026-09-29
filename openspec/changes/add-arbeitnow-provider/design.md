# Design: Arbeitnow Job Provider Ingestion Adapter

## Context

Jobify v2 uses an extensible `IJobProvider` interface ([JobProvider.ts](file:///Users/vanluv/develop/jobifyv2/src/lib/providers/JobProvider.ts)) and a central `ProviderRegistry` ([index.ts](file:///Users/vanluv/develop/jobifyv2/src/lib/providers/index.ts)) to manage job listing providers like `JustJoin.it` and `Bundesagentur für Arbeit`. See [proposal.md](file:///Users/vanluv/develop/jobifyv2/openspec/changes/add-arbeitnow-provider/proposal.md) for background and motivation.

## Goals / Non-Goals

**Goals:**
- Implement `ArbeitnowProvider` extending `BaseJobProvider` to fetch job listings directly from Arbeitnow's REST API endpoint `https://www.arbeitnow.com/api/job-board-api`.
- Parse Arbeitnow schema (`title`, `company_name`, `description`, `location`, `remote`, `tags`, `job_types`, `url`, `created_at`) into unified `JobListing` objects.
- Extract spoken language requirements (e.g. English, German) with CEFR levels from listing text and tags.
- Support `publishedAtCursor` for incremental loading using UNIX timestamps (`created_at`).
- Support total count querying (`getJobCount`) via `meta.total` in the API response.
- Provide a deterministic multi-page fallback pool generator (`arbeitnowFallbackPool.ts`) for offline or error states.
- Update frontend search UI components to include Arbeitnow as a provider option.

**Non-Goals:**
- Scraping or Tampermonkey browser scripts (the official public REST API will be used exclusively).
- Adding custom paid authentication tokens for Arbeitnow (the API is fully free and public).

## Decisions

### Decision 1: Direct REST API consumption over web scraping / Tampermonkey
- **Rationale**: Arbeitnow provides a free, unauthenticated REST API endpoint returning structured JSON, page links, and timestamp metadata. It eliminates HTML scraping risks, headless browser dependencies, and extension maintenance.
- **Alternatives Considered**: Tampermonkey browser script (rejected: high complexity, user burden, fragile DOM parsing).

### Decision 2: Timestamp Cursor Handling (`created_at`)
- **Rationale**: Arbeitnow returns `created_at` as a UNIX epoch timestamp (in seconds, e.g. `1786516800`). `ArbeitnowProvider` converts this to an ISO 8601 string for `published_at` on the `JobListing` and compares UNIX timestamps for `publishedAtCursor` filtering during incremental scans.
- **Alternatives Considered**: Filtering by pagination page index only (rejected: breaks deduplication and incremental loading across search sessions).

### Decision 3: Deterministic Offline Fallback Pool
- **Rationale**: Following the design pattern established by `arbeitsagenturFallbackPool` and `fallbackPool` (for JustJoin.it), `arbeitnowFallbackPool` generates synthetic but deterministic Arbeitnow job listings when offline or during test suite runs.

## Risks / Trade-offs

- **[Risk]**: The API returns 100 listings per page without server-side keyword filtering parameters.
  - **Mitigation**: Fetch pages sequentially, apply in-memory client-side keyword and location matching, and rely on timestamp cursor bounds to minimize network payload.
- **[Risk]**: Spoken languages in job descriptions may be in HTML format.
  - **Mitigation**: Strip HTML tags prior to language regex extraction while inspecting both tags array and description text.

## Migration Plan

1. Add `ArbeitnowProvider.ts` and `arbeitnowFallbackPool.ts` under `src/lib/providers/`.
2. Register `arbeitnow` in `ProviderRegistry` in `src/lib/providers/index.ts`.
3. Add `'arbeitnow'` to provider types in `src/types/index.ts`.
4. Update UI components (`SearchFilters`, search session parameters) to surface Arbeitnow provider checkboxes.
5. Add unit tests for `ArbeitnowProvider`.
