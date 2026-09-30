# Design

## Context

See `proposal.md` for motivation. Currently, the primary scan button displays `Scan Batch ({batchSize})` unconditionally, triggering forward pagination or incremental fetching using `limit = batchSize`. We are introducing a clean two-stage scanning lifecycle: initial prefetch batching followed by incremental update scanning once matches or a checkpoint exist.

## Goals / Non-Goals

**Goals:**
- Provide clear UI distinction between initial prefetch (`Scan Batch (X)`) and incremental updates (`Update`).
- Ensure `Update` mode queries for all newly published vacancies since the latest `publishedAtCursor` (up to max provider limit of 100).
- Automatically switch back to `Scan Batch (X)` when a session is reset or cleared of matches.

**Non-Goals:**
- Modifying provider-level incremental date filtering algorithms (they already support `publishedAtCursor`).
- Changing the underlying Supabase `scan_checkpoints` or `job_matches` database schemas.

## Decisions

### 1. Button State Determination
- Compute `isUpdateState = matches.length > 0 || Boolean(publishedAtCursor)`.
- **When `isUpdateState` is false**:
  - Primary button label: `isLoading ? 'Scanning & Scoring with AI...' : 'Scan Batch (' + batchSize + ')'`.
  - Scan limit passed: `batchSize` (from UI selector).
- **When `isUpdateState` is true**:
  - Primary button label: `isLoading ? 'Updating & Checking for New...' : 'Update'`.
  - Scan limit passed: `100` (max provider fetch ceiling to capture all new postings).

### 2. Batch Selector UI Behavior
- Keep batch size dropdown active in the header, but clarify in tooltip / dropdown that it sets the initial prefetch batch size.
- When `isUpdateState` is true, the button performs an update search for all new listings published since the checkpoint.

### 3. User Feedback & Notifications
- In Update mode, if new unique matches are found: display `"Successfully updated! Evaluated {N} new positions!"`.
- If 0 new unique matches are found: display `"You're up to date! No new vacancies posted since your last scan."`.

## Risks / Trade-offs

- **[Risk]** Large volume of new postings returned during an Update scan could cause high AI evaluation token usage.
  - **Mitigation**: Maintain the safety cap of `Math.min(100, limit)` in `/api/match/route.ts` and apply pre-filtering before AI scoring.
- **[Risk]** Switching sessions might flicker button state if session cursor/matches are loaded asynchronously.
  - **Mitigation**: Derive `isUpdateState` synchronously from active session's matches array and session cursors state.
