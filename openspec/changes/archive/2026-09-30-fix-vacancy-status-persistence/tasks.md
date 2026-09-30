# Tasks

## 1. Storage & ID Resolution Fixes

- [x] 1.1 Refactor `updateMatchStatus` in `src/lib/storage/matchStorage.ts` to properly resolve `provider_job_id` from client match IDs (stripping synthetic `match_` prefixes/timestamps if present) and verify status updates execute cleanly in Supabase.
- [x] 1.2 Update `loadSessionMatches` in `src/lib/storage/matchStorage.ts` to filter for active matches (`eq('status', 'active')` or excluding `dismissed` and `applied`) and verify applied matches do not bleed into active match state.

## 2. API Route Upsert Status Protection

- [x] 2.1 Update match batch upserts in `src/app/api/match/route.ts` to preserve existing `applied` or `dismissed` statuses during background scans and re-scans, verifying that previously actioned vacancies are not overwritten back to `active`.

## 3. UI State Synchronization & Verification

- [x] 3.1 Update `handleDismiss` and `handleApply` in `src/app/page.tsx` to pass provider job IDs and ensure state transitions sync seamlessly with Supabase.
- [x] 3.2 Verify via browser reload and track switching that dismissed vacancies remain hidden, applied vacancies remain in the Applied tab, and no actioned vacancies reappear in Matched Opportunities.
