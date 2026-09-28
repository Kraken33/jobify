# Proposal

## Why

Every scan always returns the same results because the provider adapter hardcodes `page=1` and the fallback listings are static. Users have no way to discover new vacancies beyond the initial batch, and there is no memory of which jobs have already been seen and scored — wasting OpenAI tokens on repeated evaluations.

## What Changes

- **New entity: `SearchSession`** — a named, persistent job-hunt track that separates *who the user is* (their candidate identity, used for LLM scoring) from *what they are searching for* (provider query parameters like skills, seniority, work mode, and location). A user can maintain multiple sessions concurrently (e.g. "Full Stack" and "JavaScript Engineer").
- **`publishedAt`-based provider cursor** — each session stores the `published_at` timestamp of the newest job it has fetched. Subsequent scans for the same session request only jobs published after that cursor, surfacing genuinely new listings rather than repeating the same pool.
- **Provider fingerprint invalidation** — a fingerprint is derived from the session's provider-query parameters (skills, seniority, workMode, location). When these change, the cursor resets and a full fresh scan is performed for the new search context. Changes to LLM-only profile fields (experienceSummary, targetRole, minSalary) do not invalidate the cursor.
- **Global seen-job deduplication** — each session accumulates the set of `job_ids` it has already scored. Any job already in the set is skipped before AI evaluation, preventing redundant OpenAI API calls.
- **`CandidateProfile` scoped to identity** — the profile retains skills/seniority/workMode as a "default search template" but the authoritative search parameters for each scan come from the active `SearchSession`. **BREAKING**: the `/api/match` endpoint now expects a `sessionId` alongside the profile; posting only a profile without a session uses the profile as a single implicit session.
- **`/api/match` extended response** — responses include `nextCursor` (updated `publishedAtCursor`) and `totalSeen` so the client can display progress and enable/disable the "Scan Next Batch" button.
- **UI session switcher** — the MatchesBoard gains a session selector (dropdown or tab strip) for switching between active sessions. Each session has its own match list and scan button state.
- **Multi-page fallback pool** — the static 3-listing fallback is replaced with a deterministic, page-seeded generator so pagination can be demonstrated when the live JustJoin API is unavailable.
- **Supabase schema additions** — two new tables: `search_sessions` and `scan_checkpoints`. Existing `job_matches` rows gain a `session_id` foreign key.
- **localStorage fallback for guest mode** — all checkpoint state degrades gracefully to localStorage when Supabase is not configured, so the feature works without a database.

## Capabilities

### New Capabilities

- `search-sessions`: Named, persistent job-hunt tracks that hold provider-specific search parameters (skills, seniority, workMode, location) and maintain their own pagination cursor and seen-job deduplication set, independently of the candidate identity profile.

### Modified Capabilities

- `job-provider-ingestion`: The provider adapter interface gains a `cursor` parameter (`publishedAtCursor?`, `seenJobIds?`) on `SearchCriteria` and returns a `ProviderResult` envelope containing the job listings plus a `nextCursor`. The JustJoin adapter uses the timestamp cursor to filter the API query and implements a multi-page deterministic fallback pool.
- `job-matching-engine`: The match endpoint is extended to accept a `sessionId`, load the corresponding session's checkpoint, apply deduplication before AI evaluation, and persist the updated cursor and seen-job set after each scan.
- `candidate-profile`: The profile form is scoped to identity fields only; provider search parameters are managed through `SearchSession`. The profile's existing skills/seniority/workMode fields remain as defaults for bootstrapping a first session but are no longer the authoritative source for scan queries.

## Impact

- **`src/types/index.ts`** — new `SearchSession`, `ScanCheckpoint`, `ProviderCursor`, `ProviderResult` types; `SearchCriteria` gains optional cursor fields.
- **`src/lib/providers/JobProvider.ts`** — `IJobProvider.searchJobs` signature updated to return `ProviderResult` instead of `JobListing[]`.
- **`src/lib/providers/JustJoinProvider.ts`** — cursor-aware URL construction; multi-page fallback generator.
- **`src/app/api/match/route.ts`** — session loading, checkpoint read/write, deduplication, extended response shape.
- **`src/lib/storage/`** — new `sessionStorage.ts` for localStorage checkpoint fallback.
- **`src/lib/supabase/`** — new query helpers for `search_sessions` and `scan_checkpoints` tables.
- **`src/components/MatchesBoard.tsx`** — session switcher UI, "Scan Next Batch" and "Reset" controls.
- **`supabase/migrations/`** — new migration for `search_sessions` and `scan_checkpoints` tables, and `session_id` column on `job_matches`.
- **Downstream**: existing callers of `provider.searchJobs()` must handle `ProviderResult` envelope.
