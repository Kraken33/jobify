# Proposal

## Why

Currently, when users mark a job vacancy card as "Applied" or dismiss it using "Not for me", the status changes are updated in local UI state but fail to persist to Supabase `job_matches` with Postgres error `22P02` (invalid input syntax for type uuid) because non-UUID provider job ID strings are queried against the UUID `id` column in Supabase PostgREST `.or()` filters. Additionally, subsequent batch scans and page reloads overwrite or reload job match records as `status = 'active'`, causing hidden or applied vacancies to disappear from the Applied board and reappear in Matched Opportunities. Fixing this status persistence model and query syntax ensures that candidate decisions (dismissed or applied) remain reliable and synchronized across browser reloads and scan updates.

## What Changes

- **Fix DB Record Update Query in `updateMatchStatus`**: Guard Supabase match status queries so non-UUID strings are queried exclusively against `provider_job_id` (TEXT) rather than `id` (UUID), preventing Postgres 22P02 cast errors.
- **Preserve Non-Active Status During Batch Scans**: Ensure `/api/match/route.ts` scan upserts do not reset existing `applied` or `dismissed` job statuses back to `'active'` in Supabase `job_matches`.
- **Enforce Strict Session Match Query Filtering**: Filter out `applied` and `dismissed` vacancies from active session match initial loads, preventing state overlap between the active board and applied board.
- **Client-Side Storage Fallback Sync**: Sync applied and dismissed vacancy statuses to `localStorage` as a fail-safe backup if Supabase database connectivity is unavailable.

## Capabilities

### Modified Capabilities

- `vacancy-status-management`: Clarify requirement for status updates to reliably match `provider_job_id` in Supabase without UUID type casting errors, preserve non-active statuses (`applied`, `dismissed`) during re-scans, and maintain consistency across page reloads.

## Impact

- `src/lib/storage/matchStorage.ts`: Updated `updateMatchStatus`, `loadSessionMatches`, and `saveSessionMatches` to resolve match IDs accurately by `provider_job_id` without UUID casting failures.
- `src/app/api/match/route.ts`: Updated DB match upsert queries to avoid overwriting existing non-active job statuses (`applied` or `dismissed`) during automated match scoring.
- `src/app/page.tsx`: Ensured correct loading, removal, and filtering of active vs applied vs dismissed vacancies across session changes and reloads.
