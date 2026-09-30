# Design: Applied Vacancies Deduplication and Persistence

## Context
See [proposal.md](proposal.md) for background and motivation. Currently, matches are persisted both during the API scan route (`/api/match`) and subsequently in the client component (`src/app/page.tsx` via `saveSessionMatches`). Because Postgres `upsert` with `onConflict: 'session_id,provider_job_id'` falls back to standard `insert` on constraint error `42P10`, repeated scans accumulate duplicate records for the same vacancy in `job_matches`. When a vacancy is marked as applied, all matching records across sessions are updated to `status: 'applied'`, but `loadAppliedMatches()` loads every matching row without deduplication, returning dozens of duplicates after page reload.

## Goals / Non-Goals

**Goals:**
- Deduplicate matches in `loadAppliedMatches()` by `provider_job_id` / `job.id` so that the client consistently sees each unique applied vacancy once.
- Eliminate duplicate scan persistence by relying on `/api/match` for server-side persistence of scanned batches, removing redundant `saveSessionMatches` calls in `src/app/page.tsx`.
- Add an in-memory or query-based deduplication safeguard when writing fallback rows in `matchStorage.ts` to prevent runaway duplicate insertions.
- Ensure all tests pass.

**Non-Goals:**
- Altering the global visibility of Applied vacancies across sessions (Applied vacancies remain global).
- Modifying how active matches are scored or filtered.

## Decisions

### 1. In-Memory Deduplication in `loadAppliedMatches`
- **Choice**: Track `seenJobIds = new Set<string>()` in `loadAppliedMatches()` in `src/lib/storage/matchStorage.ts`, identical to `loadSessionMatches()`.
- **Rationale**: Guarantees consistent representation of applied jobs in UI even if duplicate rows exist in Supabase from prior versions.
- **Alternative Considered**: SQL `DISTINCT ON (provider_job_id)`. While valid, client-side deduplication is robust against varying database constraints and handles mock/fallback environments uniformly.

### 2. Single-Point Persistence on Scan
- **Choice**: Remove client-side `saveSessionMatches` on scan completion in `src/app/page.tsx`. `/api/match` already persists newly scored matches to Supabase idempotently.
- **Rationale**: Prevents race conditions and double-insertions on every scan event.

## Risks / Trade-offs

- **[Risk] Existing database duplicates** → `loadAppliedMatches()` and `loadSessionMatches()` deduplicate on read, shielding users from historic duplicates.
