# Tasks

## 1. Type System — New Types and Updated Contracts

- [x] 1.1 Add `ProviderCursor`, `ProviderResult`, `SearchSession`, and `ScanCheckpoint` interfaces to `src/types/index.ts`; extend `SearchCriteria` with optional `publishedAtCursor?: string | null` and `seenJobIds?: string[]`. Verify TypeScript compiles without errors (`npx tsc --noEmit`).
- [x] 1.2 Add `sessionId?: string` to `MatchResult` (optional, nullable) so each match can be associated with its source session. Verify no downstream type errors from this addition.

## 2. Provider Layer — Cursor-Aware Adapter

- [x] 2.1 Update `IJobProvider` in `src/lib/providers/JobProvider.ts` to declare `searchJobs(criteria: SearchCriteria): Promise<ProviderResult>` (returns `ProviderResult` envelope instead of `JobListing[]`). Update `BaseJobProvider` abstract signature to match. Verify `npx tsc --noEmit` passes.
- [x] 2.2 Update `JustJoinProvider.searchJobs` to: (a) read `criteria.publishedAtCursor` and, when present, set it as a constraint in the URL (or apply date filtering in the application layer after fetch since JustJoin's API may not support direct date params); (b) determine the newest `published_at` across the returned listings and set it as `nextCursor.publishedAtCursor`; (c) return `{ listings, nextCursor, fallback: false }`. Verify that calling the method with no cursor returns all listings and `nextCursor` is non-null when at least one listing has a `publishedAt`.
- [x] 2.3 Replace `getSampleFallbackListings(criteria)` with `getSampleFallbackListings(criteria, page: number)` that uses a djb2-like hash seeded by `page` to select a distinct permutation from a pool of ~18 template listings. Verify that `page=1` and `page=2` return zero overlapping listing IDs. Return the fallback inside a `ProviderResult` with `fallback: true`.
- [x] 2.4 Add a helper `computeProviderFingerprint(params: { skills: string[], seniority: string, workMode: string, location?: string }): string` in `src/lib/providers/fingerprint.ts` using deterministic JSON serialisation + a djb2 hash. Verify that the same inputs always produce the same string and that swapping any single field changes the output.

## 3. Checkpoint Storage — Supabase + localStorage

- [x] 3.1 Create `src/lib/storage/checkpointStorage.ts` with:
  - `loadCheckpoint(sessionId: string, providerId: string): Promise<ScanCheckpoint | null>` — reads from Supabase `scan_checkpoints` if configured, falls back to `localStorage` key `jobify:checkpoint:{sessionId}:{providerId}`.
  - `saveCheckpoint(checkpoint: ScanCheckpoint): Promise<void>` — upserts to Supabase or writes to `localStorage`.
  - `clearCheckpoint(sessionId: string, providerId: string): Promise<void>`.
  Verify that when `isSupabaseConfigured` is false, calls read/write from localStorage without throwing.
- [x] 3.2 Create `src/lib/storage/sessionStorage.ts` (not to be confused with the browser `sessionStorage` API — name the module file carefully) with:
  - `loadSessions(profileId?: string): Promise<SearchSession[]>`.
  - `saveSession(session: SearchSession): Promise<SearchSession>` — upserts.
  - `createImplicitSession(profile: CandidateProfile): SearchSession` — derives a session from profile defaults with a stable ID (`jobify:implicit:{hash(profileId)}`).
  Verify that `createImplicitSession` produces the same ID given the same profile.
- [x] 3.3 Write a Supabase migration file at `supabase/migrations/20260928100000_add_search_sessions.sql` with: `search_sessions` table, `scan_checkpoints` table (unique on `(session_id, provider_id)`), and `ALTER TABLE job_matches ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES search_sessions(id) ON DELETE SET NULL`. Add RLS `allow all` policies matching the existing pattern. Verify the SQL parses without syntax errors by running `psql --no-psqlrc -f <file>` or checking with `supabase db lint`.

## 4. Match Engine — Session Scoping & Deduplication

- [x] 4.1 Update `/api/match/route.ts` to accept optional `sessionId` in the JSON request body. If absent or not found, resolve or create the implicit default session for the given profile and use its ID.
- [x] 4.2 In `/api/match/route.ts`: load the session checkpoint using `loadCheckpoint(session.id, providerId)`. Compute the current provider fingerprint for the session's parameters. If the fingerprint matches the checkpoint, forward `publishedAtCursor` and `seenJobIds` to the provider's `searchJobs`; if it differs or no checkpoint exists, leave both null (triggers a full fetch).
- [x] 4.3 After receiving `ProviderResult`, filter out any listing whose `id` is in `criteria.seenJobIds` before pre-filtering and AI evaluation. Verify that a listing with an ID already in `seenJobIds` does not appear in the response `matches`.
- [x] 4.4 After scoring, call `saveCheckpoint` with the updated checkpoint: merged `seenJobIds` (existing + newly scored IDs, capped at 500 most-recent), `publishedAtCursor` set to `result.nextCursor.publishedAtCursor`, updated `providerFingerprint`, and `lastScanAt = now()`. Verify the checkpoint is persisted (check localStorage or Supabase row) after a successful scan.
- [x] 4.5 Extend the route's success response to include `nextCursor`, `totalSeen`, and `sessionId`. Verify the response shape matches the design contract.
- [x] 4.6 When inserting rows into `job_matches`, include `session_id: sessionId` in the row object. Verify that a Supabase-configured run produces `job_matches` rows with a non-null `session_id`.

## 5. UI — Session Switcher and Scan Controls

- [x] 5.1 Add `sessions`, `activeSessionId`, `onSessionChange`, `nextCursor`, and `onResetSession` to `MatchesBoardProps` in `src/components/MatchesBoard.tsx`. Update the component signature and verify TypeScript compiles.
- [x] 5.2 Render a session dropdown (or implicit session label when only one session exists) in the MatchesBoard control header. When only an implicit session exists, display it as "Default Search" with the session's skills as a subtitle. Verify the dropdown renders without errors when `sessions` has one entry.
- [x] 5.3 Replace the "Scan JustJoin.it Now" button with "Scan Next Batch" that is disabled when `nextCursor` is null (no more new data) or `isLoading` is true. Add a "Reset Session" secondary button that clears matches and calls `onResetSession`. Verify both buttons render and the "Scan Next Batch" button is disabled when `nextCursor` is null.
- [x] 5.4 In `src/app/page.tsx`: add `sessions`, `activeSessionId`, `cursors` (`Record<string, ProviderCursor>`) state. On mount, call `loadSessions(profile.id)` and `setActiveSessionId` to the first session (or create an implicit one). Update `handleTriggerScan` to pass `sessionId` and the active session's cursor. On scan response, update `cursors[sessionId]` with `nextCursor`. Pass the new props to `MatchesBoard`. Verify that after a scan, the "Scan Next Batch" button is enabled when `nextCursor.publishedAtCursor` is non-null.
- [x] 5.5 Add an `onResetSession` handler in `page.tsx` that clears `matches`, sets `cursors[activeSessionId]` to null, and calls `clearCheckpoint(activeSessionId, providerId)`. Verify that after reset, the next scan fetches a full pool (no date filter).

## 6. Integration Verification

- [x] 6.1 Run the dev server (`npm run dev`) and perform two consecutive scans with the same profile. Verify the second scan's `totalFetched` response field is 0 or contains only listings with `publishedAt` after the cursor stored from the first scan (check network tab or server logs).
- [x] 6.2 Change one provider-query field in the profile (e.g. switch `workMode`), trigger a scan, and verify in the network response that `nextCursor.publishedAtCursor` reflects a fresh full scan (not the previous cursor value).
- [x] 6.3 Change only `experienceSummary` in the profile, trigger a scan, and verify the cursor from the previous scan is still used (no full-pool refetch).
- [x] 6.4 With no Supabase configured (default env), verify that checkpoint state survives a hard page reload: scan once, reload the page, scan again — the second scan should not re-fetch jobs already seen in the first scan.
- [x] 6.5 Verify the fallback path: with the JustJoin API returning 503 (or by temporarily pointing the `baseUrl` to an unreachable host), confirm that two successive scans return different listing IDs (multi-page fallback generator is working).
