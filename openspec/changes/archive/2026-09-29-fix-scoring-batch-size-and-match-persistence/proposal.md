# Proposal

## Why

When scanning jobs for an active search session, several issues degraded the user experience:
1. **Premature Provider-Level Filtering**: `ArbeitnowProvider` aggressively discarded vacancies that didn't strictly match remote/keyword filters inside the provider adapter itself, instead of passing all fetched vacancies to the matching engine where constraint failures are surfaced as Low Match (25% score, no LLM cost).
2. **Artificial AI Scoring Cap**: `/api/match` capped OpenAI evaluation to 12 jobs (`.slice(0, 12)`), ignoring the requested batch limit (e.g., 20 or custom amount).
3. **Provider Pagination Stalling**: Scans were not incrementing web search page numbers (`page=1`, `page=2`), causing subsequent scans to report 0 new jobs even though hundreds of vacancies remain.
4. **Fragile Match Persistence on Reload**: When Supabase unique constraints were not yet migrated in the remote database, `upsert` queries threw unhandled errors in `/api/match`, causing matches to fail to save and disappear entirely on page reload.

## What Changes

- **Show Every Vacancy**: Ensure provider adapters pass all fetched vacancies to the matching engine without premature dropping. Constraint mismatches (e.g. on-site when remote preferred) receive a 25% Low Match evaluation without LLM evaluation, ensuring full visibility with zero wasted AI tokens.
- **Dynamic Batch Sizing**: Evaluate all eligible jobs in the fetched batch up to the requested batch limit (`maxScanLimit`) with OpenAI.
- **Provider Multi-Page Pagination**: Advance provider search pages (`page=1`, `page=2`, etc.) across scans to systematically ingest all vacancies in the provider pool.
- **Resilient & Idempotent Persistence**: Implement bulletproof fallback persistence (upsert with insert fallback and in-memory deduplication) across `/api/match` and `matchStorage.ts` so matches always persist and load correctly across reloads without multiplying.

## Capabilities

### Modified Capabilities
- `job-matching-engine`: Pass all fetched listings through the evaluation pipeline; score eligible listings with OpenAI up to the full batch limit and assign non-matching listings synthetic Low Match evaluations (score 25%, no LLM call) without dropping any vacancy.
- `search-sessions`: Persist and load session matches reliably across page reloads and advance pagination across consecutive batch scans.

## Impact

- **Provider Adapters**: `src/lib/providers/ArbeitnowProvider.ts` (pass all parsed listings, advance page-based pagination).
- **Matching Engine API**: `src/app/api/match/route.ts` (evaluate full batch, resilient Supabase upsert/insert fallback).
- **Client Storage Layer**: `src/lib/storage/matchStorage.ts`, `src/app/page.tsx` (deduplicated loading and persistent storage).
- **Database Schema**: `supabase/migrations/20260929193000_job_matches_unique_constraint.sql`.
- **Test Suite**: `src/__tests__/sessionManagement.test.ts`, provider tests.
