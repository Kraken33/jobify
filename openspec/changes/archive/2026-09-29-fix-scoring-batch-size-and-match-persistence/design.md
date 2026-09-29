# Design

## Context

See [proposal.md](file:///Users/vanluv/develop/jobifyv2/openspec/changes/fix-scoring-batch-size-and-match-persistence/proposal.md) for motivation.

Key discoveries from exploration:
1. `ArbeitnowProvider` was discarding non-matching jobs in `matchesCriteria()` inside the provider adapter itself, preventing non-matching vacancies on the page from reaching `/api/match`.
2. In Jobify's architecture, ALL vacancies returned by provider queries should flow to the pre-filter. Jobs passing hard constraints are sent to OpenAI for scoring; jobs failing hard constraints receive synthetic low-match evaluations (score: 25%, verdict: Low Match) with gap explanations and 0 LLM calls.
3. Arbeitnow HTML scraping was fixed to page 1 and lacked multi-page batch retrieval and page cursor advancement.
4. Supabase persistence in `/api/match` and `matchStorage.ts` must use fallback strategies (upsert with insert fallback on missing constraint) and client-side deduplication so that reload always displays stored vacancies correctly.

## Goals / Non-Goals

**Goals:**
- Pass all parsed provider listings directly to the matching engine without premature dropping.
- Score eligible listings with OpenAI up to the requested batch limit (`maxScanLimit`).
- Assign non-matching listings synthetic Low Match evaluations (25% score, 0 LLM tokens).
- Advance pagination across consecutive scans so subsequent batches fetch subsequent pages.
- Ensure match persistence is resilient to remote database schema differences and deduplicated on reload.

**Non-Goals:**
- Calling LLM on constraint-failing vacancies (they remain cost-free 25% low matches).
- Modifying JustJoin Apify scraper actor internals.

## Decisions

### Decision 1: Pass All Scraped/Fetched Provider Listings to Pre-Filter
- **Choice:** Remove aggressive drop filtering in `ArbeitnowProvider.matchesCriteria` so all vacancies on the page are returned in `listings`.
- **Rationale:** The candidate profile evaluation in `preFilter.ts` and `/api/match/route.ts` is the single source of truth for converting mismatches into low-match cards (25% score).

### Decision 2: Multi-Page Fetching & Page Cursor Advancement in ArbeitnowProvider
- **Choice:** If the requested batch `limit` exceeds available unseen vacancies on a page, fetch consecutive pages (`page=1`, `page=2`, etc.). Store the last fetched page in the cursor so subsequent scans continue on the next page.
- **Rationale:** Ensures scans of 20, 50, etc. actually collect the full batch size from Arbeitnow.

### Decision 3: Resilient Supabase Persistence with Insert Fallback
- **Choice:** In `/api/match/route.ts` and `src/lib/storage/matchStorage.ts`, perform `upsert` and if a Postgres error occurs (such as missing unique constraint), gracefully fall back to inserting rows. In `loadSessionMatches()`, deduplicate by `provider_job_id`.
- **Rationale:** Guarantees that vacancies never disappear on reload regardless of whether a migration was run locally or on remote Supabase.

## Risks / Trade-offs

- **[Provider Rate Limiting]** → Multi-page fetches are bounded by `maxScanLimit` (max 100).
- **[Token Economy]** → Hard constraint failures do not invoke OpenAI, preserving API quota while providing 100% visibility of all vacancies.
