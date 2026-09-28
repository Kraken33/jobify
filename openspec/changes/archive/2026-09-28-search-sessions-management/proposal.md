# Proposal

## Why

Users currently cannot create, customize, or delete search sessions in the UI. When multiple tracks are needed (for example, exploring "Full Stack" opportunities while concurrently running a separate search for "JavaScript" vacancies), users are locked into a single implicit default session derived from their candidate profile. Furthermore, match results are kept in a single flat in-memory array rather than isolated and persisted per session, causing match history to mix or disappear when switching contexts.

## What Changes

- **Create Session Modal (`CreateSessionModal`)**: A new dialog accessible directly from the Matches board allowing users to create a custom search session with:
  - An option to **Inherit from Profile** (pre-filling target role, skills, seniority, work mode, and location) or **Start from Scratch**.
  - Customizable session name (e.g. "Full Stack Track", "JavaScript Engineer"), target skills, seniority, work mode, and preferred location.
- **Session Switcher & Deletion in `MatchesBoard`**:
  - Direct session switching dropdown displaying active search tracks.
  - "+ New Track" trigger button.
  - "Delete Track" action allowing removal of non-default sessions (with confirmation), cleaning up corresponding checkpoints and cached matches.
- **Per-Session Match Isolation & Persistence**:
  - Match results are isolated per `sessionId` (both in state and client storage via `jobify:matches:{sessionId}` as well as Supabase `job_matches` query fallback).
  - Switching sessions immediately swaps the matches view to that session's own scored positions without bleeding results across sessions.
  - Resetting a session clears only that specific session's match history and pagination checkpoint.
- **Session CRUD Operations in `sessionStorage.ts`**:
  - Add `deleteSession(sessionId: string)` to clean up localStorage and Supabase `search_sessions` rows along with associated checkpoints.

## Capabilities

### Modified Capabilities
- `search-sessions`: Enhance requirements for session lifecycle management (adding session creation modal with profile inheritance vs scratch options, and session deletion) and explicit match isolation/persistence per session.

## Impact

- `src/components/MatchesBoard.tsx`: Session switcher UI enhanced with "+ New Track" button, "Delete Track" button, and per-session match rendering.
- `src/components/CreateSessionModal.tsx`: New component for configuring and creating search sessions.
- `src/lib/storage/sessionStorage.ts`: Add `deleteSession` helper function and persistence logic.
- `src/lib/storage/matchStorage.ts` (or extension in `sessionStorage.ts`): Helper to load/save/clear matches partitioned by `sessionId`.
- `src/app/page.tsx`: Manage active session switching, per-session match state loading and updating.
