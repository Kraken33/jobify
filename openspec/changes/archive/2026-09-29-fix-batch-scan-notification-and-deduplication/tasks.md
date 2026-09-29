# Tasks

## 1. Client Scan Request & Toast Notification Updates

- [x] 1.1 Update `handleTriggerScan` in `src/app/page.tsx` to include `matches` and `cursors` in its `useCallback` dependency array, extract `seenJobIds` from active session matches, and forward `seenJobIds` and `publishedAtCursor` in the POST `/api/match` payload body. Verify by inspecting network request payload during consecutive scans.
- [x] 1.2 Update toast notification logic in `src/app/page.tsx` to check `newUnique.length` (newly appended matches). Display `"Successfully evaluated X new positions!"` when `newUnique.length > 0` and `"There are no new vacancies added"` when `newUnique.length === 0`. Verify by executing consecutive scans when no new vacancies exist.

## 2. Server Checkpoint Fallback Handling

- [x] 2.1 Update POST `/api/match` route in `src/app/api/match/route.ts` to parse `seenJobIds` and `publishedAtCursor` from request body and fall back to them when Supabase checkpoints are not loaded. Verify by running a consecutive scan in guest mode and confirming unseenListings deduplication occurs.

## 3. Integration & Test Verification

- [x] 3.1 Run `npm test` and verify all unit and integration tests pass cleanly without errors.
