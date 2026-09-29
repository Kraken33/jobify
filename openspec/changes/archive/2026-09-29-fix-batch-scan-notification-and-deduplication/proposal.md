# Proposal: Fix Batch Scan Notification and Deduplication

## Why

When users run a batch scan and immediately trigger a subsequent scan on a provider track with no remaining new vacancies (or when operating in client-only/guest mode without a Supabase connection), the application currently displays `"Successfully evaluated 20 positions!"`. In reality, 0 new vacancies were added to the match list.

This occurs because:
1. The client UI (`page.tsx`) bases its success notification message on total `returnedMatches.length` from the API rather than `newUnique.length` (the count of new vacancies actually appended to the matches list).
2. The client does not forward its known `seenJobIds` or pagination cursor in the POST `/api/match` request payload, causing backend scans to re-fetch and re-evaluate duplicate listings when database checkpoints are absent.

## What Changes

- **Client Payload Forwarding (`page.tsx`)**: Update batch scan trigger in `page.tsx` to include `seenJobIds` (extracted from active matches) and session cursor in the POST `/api/match` request body.
- **Server Checkpoint Fallback (`/api/match/route.ts`)**: Update `/api/match` route to merge client-provided `seenJobIds` and `publishedAtCursor` when database checkpoints are unavailable, preventing duplicate job fetching and redundant AI matcher calls.
- **Accurate UI Scan Notifications (`page.tsx`)**:
  - Change the success toast trigger to rely on `newUnique.length` (newly added vacancies).
  - Display `"Successfully evaluated X new positions!"` when `newUnique.length > 0`.
  - Display `"There are no new vacancies added"` (or server notice/message) when `returnedMatches.length > 0` but `newUnique.length === 0`, or when `returnedMatches.length === 0`.

## Capabilities

### Modified Capabilities

- `job-matching-engine`: Require client payload forwarding for `seenJobIds` and cursor state, update server checkpoint fallback resolution, and specify accurate UI notification criteria based on newly appended match count.
- `search-sessions`: Require client scan requests to include active session `seenJobIds` and cursor state in scan payload body.

## Impact

- Affected files:
  - `src/app/page.tsx`
  - `src/app/api/match/route.ts`
  - `src/types/index.ts` (if criteria payload types need explicit seenJobIds/cursor fields)
- APIs: POST `/api/match` body payload schema expanded.
- Performance: Eliminates redundant AI evaluations on previously seen vacancies when running consecutive batch scans.
