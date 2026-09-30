# Proposal: Fix Applied Vacancies Deduplication and Persistence

## Why
When marking a vacancy as "Applied", the UI correctly shows 1 applied vacancy in memory, but reloading the page results in 20 (or more) applied items showing on the Applied tab. This occurs because `loadAppliedMatches()` does not deduplicate matches by `provider_job_id` when loading from Supabase, combined with redundant scan persistence loops and duplicate rows in the `job_matches` table.

## What Changes
- **Deduplication in `loadAppliedMatches`**: Update `loadAppliedMatches()` in `src/lib/storage/matchStorage.ts` to deduplicate returned rows by `provider_job_id` / `job.id`, consistent with `loadSessionMatches()`.
- **Eliminate Redundant Scan Persistence**: Remove duplicate `saveSessionMatches` invocation during scan completion in `src/app/page.tsx`, relying on server-side `/api/match` persistence to eliminate double insertion of match rows.
- **Idempotent Match Persistence**: Ensure fallback match insertions in `src/lib/storage/matchStorage.ts` check for existing `provider_job_id` within the session before inserting new records.
- **Database Cleanup / Migration Script**: Provide instructions or a migration utility to prune existing duplicate rows in `job_matches`.

## Capabilities

### Modified Capabilities
- `vacancy-status-management`: Update the Applied Status Tracking requirement to mandate deduplication by `provider_job_id` / `job.id` when loading applied matches across all sessions from Supabase.

## Impact
- **Affected Code**: `src/lib/storage/matchStorage.ts`, `src/app/page.tsx`, `src/app/api/match/route.ts`
- **User Experience**: Reloading the page after marking 1 vacancy as applied will consistently show 1 applied item, matching the live count and board state.
