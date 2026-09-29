# Design: Arbeitnow Batch Scan Delta Cursor

## Context

See `proposal.md` for motivation. Currently `ArbeitnowProvider.ts` in `fetchLiveJobs` parses `criteria.publishedAtCursor` if it starts with `page:`, setting `startPage` to `parsedPage` and returning `nextCursor: { publishedAtCursor: \`page:${currentPage}\` }`.

Because Arbeitnow web search is sorted newest-first (`sort_by=newest`), `page=1` contains the newest postings. Setting `publishedAtCursor` to `page:2` causes subsequent scans to fetch `page=2` (older jobs), evaluating past jobs instead of checking `page=1` for newly posted jobs.

## Goals / Non-Goals

**Goals:**
- Align `ArbeitnowProvider` cursor management with `JustJoinProvider` and `ArbeitsagenturProvider` by returning ISO timestamp strings (`publishedAtCursor = newestPublishedAt`).
- Ensure incremental scans start fetching from Page 1 (where new vacancies arrive first).
- Filter out items published on or before `publishedAtCursor` and items present in `seenJobIds`.
- Return `0` unseen listings when no new postings exist on Page 1, enabling the API match route to surface "No new postings since your last scan".

**Non-Goals:**
- Changing how Arbeitnow HTML or fallback REST API parsing works.
- Altering pre-filtering or OpenAI scoring logic.

## Decisions

### Decision 1: Always Start Delta Ingestion from Page 1
- **Rationale**: Arbeitnow web search orders listings newest-first. Newly posted positions always appear on Page 1.
- **Implementation**: In `ArbeitnowProvider.fetchLiveJobs`, remove page incrementation based on `publishedAtCursor`. Start `currentPage = 1`.
- **Alternatives Considered**:
  - Keep page incrementing: Rejected because page 2/3/4 contain older historical vacancies, breaking incremental scanning.

### Decision 2: Standardize Cursor Output to ISO Timestamp
- **Rationale**: Matches the project spec (`job-provider-ingestion` requirement 1 & 4) and existing behavior in `normalizeApiResponse`.
- **Implementation**:
  - Collect Page 1 results (and subsequent pages up to `targetLimit` if page 1 is small).
  - Deduplicate against `seenJobIds`.
  - Filter by `publishedAt > publishedAtCursor` when a timestamp cursor is present.
  - Return `nextCursor: newestPublishedAt ? { publishedAtCursor: newestPublishedAt } : null`.
- **Alternatives Considered**:
  - Composite cursor `page:2|2026-09-29T00:00:00Z`: Rejected as unnecessary complexity; Page 1 inspection with `seenJobIds` handles delta updates cleanly.

## Risks / Trade-offs

- **[Risk] Existing Unit Tests Expecting `page:3` Cursor**:
  - *Mitigation*: Update unit tests in `src/__tests__/arbeitnowProvider.test.ts` to assert ISO timestamp cursors rather than `page:N` string format.
