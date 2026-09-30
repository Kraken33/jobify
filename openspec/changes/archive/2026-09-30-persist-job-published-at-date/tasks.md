# Tasks

## 1. Database Migration

- [x] 1.1 Create migration file `supabase/migrations/20260930190000_add_job_matches_published_at.sql` adding `published_at timestamp with time zone` to `public.job_matches` and verify SQL syntax with migration files.

## 2. Storage & API Persistence

- [x] 2.1 Update `src/lib/storage/matchStorage.ts` `saveSessionMatches` to include `published_at: m.job.publishedAt || null` in row payloads, and update `loadSessionMatches` and `loadAppliedMatches` to map `publishedAt: row.published_at || undefined`.
- [x] 2.2 Update `src/app/api/match/route.ts` to include `published_at: m.job.publishedAt || null` in the Supabase row payload for newly fetched matches.

## 3. Testing & Verification

- [x] 3.1 Update `src/__tests__/matchStorage.test.ts` to verify that `publishedAt` is preserved across `saveSessionMatches` and `loadSessionMatches` as well as `loadAppliedMatches`.
- [x] 3.2 Run `npm test` across the full test suite to ensure all unit tests pass without regressions.
