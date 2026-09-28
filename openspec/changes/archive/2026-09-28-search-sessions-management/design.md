# Design

## Context

See `proposal.md` for background and user goals.
Currently:
- The data models `SearchSession`, `ScanCheckpoint`, and `JobListing` already exist.
- Supabase tables `search_sessions`, `scan_checkpoints`, and `job_matches (session_id)` have been defined and deployed.
- `sessionStorage.ts` provides `loadSessions`, `saveSession`, and `createImplicitSession`.
- `checkpointStorage.ts` provides `loadCheckpoint`, `saveCheckpoint`, and `clearCheckpoint`.
- However, `page.tsx` keeps matches in a single global `matches` array in memory, and there is no UI for adding or removing custom search sessions.

## Goals / Non-Goals

**Goals:**
- Provide a clean, intuitive modal component (`CreateSessionModal`) to create custom sessions with pre-filled profile defaults or from scratch.
- Add deletion capabilities for custom sessions, cleaning up their local/Supabase records, checkpoints, and match caches.
- Enable true per-session match isolation so switching sessions instantly displays the active session's cached matches and allows continuing pagination seamlessly.
- Ensure full offline / guest mode support with `localStorage` fallback alongside Supabase persistence.

**Non-Goals:**
- Cross-user collaboration or multi-tenant session sharing.
- Favorites and follow interface (deferred to a subsequent change iteration as requested by the user).
- Background scheduled periodic scans across inactive sessions.

## Decisions

### 1. Per-Session Match Storage via Dedicated Storage Module
**Decision:** Create a lightweight client match storage utility (`src/lib/storage/matchStorage.ts`) using key `jobify:matches:{sessionId}` for localStorage and Supabase `job_matches` table when configured.
- *Rationale:* Ensures instantaneous context switching without making repeated network calls or losing scored vacancies when jumping between "Full Stack" and "JavaScript" tracks.
- *Alternatives considered:* Keeping all matches in memory inside `page.tsx` as a `Record<string, MatchResult[]>` without persistence: fails on page reload or tab switch.

### 2. Session Deletion Flow
**Decision:** Expose `deleteSession(sessionId: string)` in `sessionStorage.ts`. When a session is deleted:
1. It deletes the record in `localStorage` and Supabase `search_sessions`.
2. It deletes associated checkpoints via `clearCheckpoint(sessionId, provider)`.
3. It removes the cached matches for that session via `clearSessionMatches(sessionId)`.
4. If the active session is deleted, the active session automatically switches to the first available session (or bootstraps a default implicit session if none remain).
- *Rationale:* Keeps storage clean and prevents orphaned checkpoints or match lists.

### 3. Session Creation Modal UX: Profile Inheritance Toggle
**Decision:** `CreateSessionModal` presents a toggle "Inherit configuration from Profile" (checked by default).
- When checked: Form initializes with profile's target role, skills, seniority, work mode, and location. Modifying these fields only impacts the newly created session, not the master profile.
- When unchecked: Form initializes with blank fields, enabling the user to craft a completely separate niche track (e.g. "Golang Microservices").
- *Rationale:* Meets the user requirement cleanly while providing maximum flexibility.

### 4. MatchesBoard Integration
**Decision:** Update `MatchesBoard` header:
- Replace the simple `<select>` dropdown with an interactive track bar or an enhanced selector including:
  - Session selector with active track indicator and skills preview.
  - "+ New Track" button opening `CreateSessionModal`.
  - "Delete Track" button (hidden or disabled if there is only one session).
  - "Reset Track" button (clearing matches & cursor for active session).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| LocalStorage quota limits if user stores hundreds of matches across multiple sessions | Cap stored matches per session at 100 most recent items in localStorage. Older matches can be pruned if needed. |
| User deletes the only session remaining | Prevent deletion if `sessions.length <= 1`, or immediately recreate an implicit default session. |
| Implicit session ID handling | Custom sessions receive explicit UUIDs (`crypto.randomUUID()` in browser), distinct from implicit deterministic IDs (`jobify:implicit:...`). |

## Migration Plan

1. No DB schema changes needed; existing `search_sessions`, `scan_checkpoints`, and `job_matches` tables already support UUID session IDs.
2. Changes are purely additive in the frontend UI and storage layers.
