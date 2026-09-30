# Design

## Context

Currently, match status updates fail to persist to Supabase with error `22P02` (`invalid input syntax for type uuid`) because `updateMatchStatus` constructs PostgREST `.or()` filters combining `id.eq.<string>` and `provider_job_id.eq.<string>`. When a provider job ID (e.g. `arbeitnow_12345`) or synthetic match ID (`match_arbeitnow_12345_timestamp`) is queried against `id.eq.`, PostgreSQL attempts to cast it to UUID, which triggers Postgres error 22P02 and fails the entire update statement.

Furthermore, during new scans or updates executed via `/api/match/route.ts`, candidate matches are inserted or upserted into Supabase with hardcoded `status = 'active'`, overwriting any previously applied or dismissed status in the DB.

See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Fix `updateMatchStatus` in `src/lib/storage/matchStorage.ts` to validate UUID syntax before querying `id.eq.<val>`, and query non-UUID provider job IDs strictly against `provider_job_id.eq.<val>`.
- Prevent `/api/match/route.ts` from overwriting non-active job statuses (`applied` or `dismissed`) during match upserts.
- Ensure `loadSessionMatches` queries only `status = 'active'` (or non-dismissed, non-applied active matches), and strictly separate active vs applied state management in `page.tsx`.
- Maintain a client-side `localStorage` backup cache of applied match IDs as a fallback in guest or network failure scenarios.

**Non-Goals:**
- Redesigning the Supabase database schema or altering the existing `job_matches` table structure.

## Decisions

### 1. Match ID Resolution Strategy & UUID Syntax Validation in `updateMatchStatus`
- **Decision**: Update `updateMatchStatus` to validate UUID syntax:
  - If a candidate ID string matches standard UUID pattern (`/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`), construct `.or('id.eq.' + uuid + ',provider_job_id.eq.' + uuid)`.
  - For non-UUID provider job IDs (or extracted provider job IDs from synthetic `match_...` strings), query strictly `provider_job_id.eq.<providerJobId>`.
- **Rationale**: Passing non-UUID strings to PostgREST `id.eq.` causes Postgres error 22P02 which aborts the update. Separating UUID vs text column filters resolves the error completely.

### 2. Status Protection During AI Scan Upserts
- **Decision**: In `/api/match/route.ts`, before upserting newly scored matches into Supabase `job_matches`, check if matching rows already exist with `status IN ('applied', 'dismissed')`. Alternatively, use `ignoreDuplicates: true` or omit `status` field on conflict update so existing `status` values are preserved.

### 3. Separation of Active vs Applied Session Matches
- **Decision**: In `loadSessionMatches`, query `or('status.eq.active,status.is.null')` for active matches board, and keep `loadAppliedMatches` querying `eq('status', 'applied')`.

## Risks / Trade-offs

- **[Risk]** Existing DB rows might have mismatched statuses from past failed updates.
  - *Mitigation*: The new update logic will correctly re-align DB records upon user interaction without throwing 22P02.
