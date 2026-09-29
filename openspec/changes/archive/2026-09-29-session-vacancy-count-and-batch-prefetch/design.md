# Technical Design: Session Vacancy Count & Batch Prefetch Sizing

## Context

See `proposal.md` for background and motivation.

Currently, `MatchesBoard` displays a static scan button ("Scan Next Batch") that passes a hardcoded or default limit to `/api/match`. Jobify v2 provider adapters (`JustJoinProvider` and `ArbeitsagenturProvider`) fetch listings in chunks but do not expose total matching vacancies to the UI ahead of scans.

## Goals / Non-Goals

**Goals:**
- Provide a provider-level method for querying/estimating total available vacancies matching a search track's criteria.
- Expose total count via a dedicated endpoint (`/api/session/count`).
- Render a combined Total Vacancies & Prefetch Batch Dropdown on `MatchesBoard` next to the "Reset Session" button.
- Support selecting standard batch size presets (5, 10, 20, 50) and entering a custom batch prefetch size via the dropdown's last item ("Set Custom Batch Amount...").
- Pass the selected prefetch batch size as `limit` when triggering job scans.

**Non-Goals:**
- Crawling entire provider datasets to count unindexed offers.
- Modifying underlying OpenAI scoring logic (only the batch fetch limit `limit` changes).

## Decisions

### 1. Extensible `getJobCount` on Provider Adapters
- **Decision**: Add an optional `getJobCount(criteria: SearchCriteria): Promise<number | null>` method to `IJobProvider`.
- **Implementation**:
  - `ArbeitsagenturProvider`: Performs a fast `GET` to the Arbeitsagentur REST API with `page=1` & `size=1` and reads `maxErgebnisse` from the response JSON envelope.
  - `JustJoinProvider`: Returns total matching items count (from Apify dataset metadata or fallback pool count when without Apify token).
- **Alternative Considered**: Counting items client-side after scanning. (Rejected: Requires fetching all pages upfront, defeating prefetch control).

### 2. `/api/session/count` API Route
- **Decision**: Add `POST` or `GET /api/session/count` route that takes `sessionId` and `providerId`, loads the session criteria, and queries the appropriate provider adapter's `getJobCount`.
- **Response**: `{ totalVacancies: number | null, fallback: boolean }`.

### 3. MatchesBoard UI Dropdown Component
- **Decision**: Integrate a dropdown button right next to the `Reset Session` button in `MatchesBoard.tsx`.
- **UI Structure**:
  - **Button Trigger**: `[ 📊 {totalVacancies ?? 'Check'} Jobs (Batch: {batchSize}) ▾ ]`
  - **Menu Items**:
    - Section 1: Header displaying total available vacancies with a refresh button.
    - Section 2: Preset choices for batch prefetch limit (5, 10, 20, 50).
    - Section 3: **Set Custom Batch Amount...** (last item in dropdown). Clicking opens a custom limit modal or input prompt.
- **Scan Trigger Update**: Primary action button text changes to `Scan Batch ({batchSize})` and passes `limit: batchSize` to `onTriggerScan`.

## Risks / Trade-offs

- **[Provider Rate Limits]** → The count endpoint issues lightweight single-item/head queries. Caching count responses per session session-fingerprint prevents repeated redundant API calls.
- **[Apify Scraper Cost]** → Without an Apify token, `justjoin` uses deterministic pool size. With Apify, count utilizes lightweight dataset info.
