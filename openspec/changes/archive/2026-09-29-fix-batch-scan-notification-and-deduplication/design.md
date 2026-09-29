# Design: Fix Batch Scan Notification and Deduplication

## Context

See `proposal.md` - Why.
Currently, when a user triggers consecutive scan batches, the client UI reports `"Successfully evaluated 20 positions!"` regardless of whether any new vacancies were actually added to the matches board. Furthermore, client-side session state (`seenJobIds` and pagination cursor) is not forwarded in the POST `/api/match` body, causing the backend to re-fetch and re-evaluate the same vacancies when database checkpoints are absent.

## Goals / Non-Goals

**Goals:**
- Forward `seenJobIds` (from active UI matches) and `publishedAtCursor` in the POST `/api/match` payload.
- Update `/api/match/route.ts` to merge payload-provided `seenJobIds` and cursors when database checkpoints are null or incomplete.
- Fix UI toast notifications in `page.tsx` to calculate `newUnique.length` (newly added vacancies) and display accurate counts or `"There are no new vacancies added"`.

**Non-Goals:**
- Changing provider-specific search strategies or Apify actor implementations.
- Modifying hard-constraint filtering logic or LLM match scoring prompt structures.

## Decisions

### Decision 1: Payload Forwarding & State Closure Fix in Client (`page.tsx`)
**Approach:** In `handleTriggerScan` inside `src/app/page.tsx`, include `matches` and `cursors` in the `useCallback` dependency array `[profile, activeSessionId, sessions, matches, cursors]`. Extract `seenJobIds = matches.map((m) => m.job.id)` and pass it along with `publishedAtCursor: cursors[currentSessionId]?.publishedAtCursor` in the request body to `/api/match`.

**Rationale:** The client holds all currently active job matches for the selected session. Including `matches` and `cursors` in the dependency array prevents stale closures so `seenJobIds` and `newUniqueCount` are computed accurately against the latest React state. Forwarding `seenJobIds` ensures the server knows which vacancies have already been evaluated even when database checkpoints are unavailable.

### Decision 2: Fallback Checkpoint Ingestion in Server (`/api/match/route.ts`)
**Approach:** In `src/app/api/match/route.ts`, parse optional `seenJobIds` and `publishedAtCursor` fields from `body`. When `checkpoint` is null (e.g. Supabase unavailable), initialize `seenJobIds` with `body.seenJobIds` and `publishedAtCursor` with `body.publishedAtCursor`.

**Rationale:** Provides seamless deduplication and pagination continuity across guest/client-only modes and Supabase-backed modes without breaking existing database persistence.

### Decision 3: Accurate Toast Messaging based on `newUnique.length`
**Approach:** In `page.tsx`, evaluate the newly added match count (`newUnique = returnedMatches.filter(m => !existingIds.has(m.job.id))`).
- If `newUnique.length > 0`: Display `notice` or `"Successfully evaluated ${newUnique.length} new positions!"`.
- If `newUnique.length === 0`: Check if `data.message` is provided (e.g., `"No new postings since your last scan..."`), or fall back to `"There are no new vacancies added"`.

**Rationale:** Direct user feedback must reflect observable additions to the UI list, eliminating confusing toast notifications.

## Risks / Trade-offs

- **[Payload Size]** Passing a large list of `seenJobIds` (e.g., hundreds of IDs) in POST body.
  - *Mitigation*: Cap the forwarded `seenJobIds` payload slice to the most recent 500 IDs, matching the server's existing checkpoint cap limit.
