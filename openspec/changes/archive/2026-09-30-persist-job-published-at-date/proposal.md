# Proposal

## Why

When job vacancies are initially fetched from providers, they carry their original `publishedAt` timestamp, which is formatted properly on job cards (e.g. "Yesterday", "24.09.2026") and used to group and sort matches by publication day. However, the Supabase `job_matches` table does not persist `published_at`, and `matchStorage` does not serialize or rehydrate `publishedAt` during session reloads. Consequently, reloading the application causes all matches to fall back to `match.createdAt` (the scan execution date, i.e., "Today"), which corrupts card date labels and destroys day-based sorting.

## What Changes

- Add a database migration extending the `job_matches` table with a `published_at timestamp with time zone` column.
- Update `saveSessionMatches` in `src/lib/storage/matchStorage.ts` to write `published_at` to `job_matches` records.
- Update `/api/match/route.ts` to persist `published_at` when writing initial scan match records to Supabase.
- Update `loadSessionMatches` and `loadAppliedMatches` in `src/lib/storage/matchStorage.ts` to rehydrate `publishedAt` on loaded `JobListing` objects.
- Update storage and sorting test suites to verify `publishedAt` persistence and reload integrity.

## Capabilities

### Modified Capabilities
- `search-sessions`: Extend `Session-Scoped Matches` requirement to mandate persisting and rehydrating the original job publication timestamp (`published_at`) across page reloads and context switches.

## Impact

- **Database**: Adds `published_at` nullable timestamptz column to `public.job_matches`.
- **Backend API**: `/api/match/route.ts` match persistence logic.
- **Client Storage**: `src/lib/storage/matchStorage.ts` `saveSessionMatches`, `loadSessionMatches`, and `loadAppliedMatches`.
- **UI**: Job card publication date indicators and "Newest" sorting on `MatchesBoard` remain accurate and consistent before and after browser reloads.
