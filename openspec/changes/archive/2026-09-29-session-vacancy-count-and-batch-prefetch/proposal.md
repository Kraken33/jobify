# Proposal

## Why

Users currently cannot see the total number of matching vacancies available for a search session before or during scans. Additionally, users have no control over the batch size fetched per scan, defaulting to a static limit. Surfacing the total vacancy count next to the session controls and providing a dropdown to select or enter a custom prefetch batch size gives users transparency and full control over their scanning volume.

## What Changes

- Add total vacancy count querying capability to job provider adapters (`arbeitsagentur` using `maxErgebnisse` and `justjoin` using Apify dataset metadata/fallback count).
- Create a new backend endpoint `/api/session/count` (or provider count route) to fetch total matching vacancy counts for a session on demand.
- Update `MatchesBoard` header controls to replace/augment standard scan triggers with a Total Vacancies & Batch Prefetch Dropdown placed next to the "Reset Session" button.
- Support selecting prefetch batch presets (e.g. 5, 10, 20, 50) as well as setting a custom batch amount via a modal/input trigger (the last item in the dropdown).
- Update scan request handling so `/api/match` accepts and honors the chosen prefetch batch limit.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `search-sessions`: Adding requirements for total vacancy count retrieval and prefetch batch size selection within search sessions.
- `job-provider-ingestion`: Adding requirement for provider adapters to support total matching job count estimation/querying.

## Impact

- **Frontend**: `MatchesBoard.tsx`, session state handling, batch size state, and custom amount input.
- **Backend**: `/api/match/route.ts` updated for dynamic limit handling; new endpoint `/api/session/count/route.ts` for fetching total vacancy counts.
- **Providers**: `IJobProvider`, `JustJoinProvider`, `ArbeitsagenturProvider` extended with count fetching capability.
