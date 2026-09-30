# Design

## Context

See [proposal.md](proposal.md) for background and motivation. Currently, the Supabase `job_matches` table stores match evaluations and basic listing information (`title`, `company`, `city`, `url`, `is_remote`, `seniority`, `salary_min`, `salary_max`, `required_skills`, `fit_score`, `verdict`, etc.) but does not contain a `published_at` timestamp. Consequently, when matches are loaded via `loadSessionMatches` or `loadAppliedMatches`, `job.publishedAt` is undefined and UI components fall back to `match.createdAt` (the DB insert timestamp), causing all cards to display "Today" and breaking multi-day sorting.

## Goals / Non-Goals

**Goals:**
- Extend the `job_matches` table with a nullable `published_at` column (`timestamptz`).
- Persist `job.publishedAt` across all insertion points (`saveSessionMatches` in `matchStorage.ts` and `/api/match/route.ts`).
- Rehydrate `job.publishedAt` when matches are loaded from Supabase (`loadSessionMatches` and `loadAppliedMatches`).
- Ensure fallback to `match.createdAt` only occurs if a provider genuinely does not supply a `publishedAt` value.

**Non-Goals:**
- Changing provider ingestion parsing or pagination cursor mechanics (providers already return ISO `publishedAt` strings).
- Altering the UI date formatting rules in `src/lib/utils/dateFormat.ts` (the existing helper works correctly when given accurate dates).

## Decisions

### 1. Database Schema Extension
- **Decision**: Add migration `20260930190000_add_job_matches_published_at.sql` adding `published_at timestamp with time zone` to `public.job_matches`.
- **Rationale**: Keeps schema backward-compatible with existing rows (defaults to `NULL`, which gracefully falls back to `created_at` for legacy rows).
- **Alternative considered**: Storing `published_at` inside a generic JSON payload. Rejected because `job_matches` uses structured relational columns.

### 2. Serialization & Rehydration in Storage Layer
- **Decision**:
  - In `saveSessionMatches` and `/api/match/route.ts`: Map `published_at: m.job.publishedAt || null`.
  - In `loadSessionMatches` and `loadAppliedMatches`: Map `publishedAt: row.published_at || undefined` on the resulting `JobListing`.
- **Rationale**: Preserves the exact ISO string or timestamp across the full round-trip from provider fetch to database and back to client state.

## Risks / Trade-offs

- **[Risk] Legacy database rows have `published_at = NULL`**:
  - *Mitigation*: The UI already safely falls back to `(job.publishedAt || match.createdAt)`. Legacy rows will continue showing their creation date, while all new scans will preserve the real publication date.
