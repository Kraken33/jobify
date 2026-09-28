# Design

## Context

The app currently stores `MatchResult[]` per search session in `localStorage` (key: `jobify:matches:<sessionId>`). Each `MatchResult` has no user-intent field — there is no concept of dismissed or applied. The single "Apply" button on `JobCard` opens the job URL directly without recording any action.

The `ScanCheckpoint` holds `seenJobIds` to prevent re-evaluation of already-scored jobs; dismissed jobs must NOT be added to this set (dismiss is display-only).

## Goals / Non-Goals

**Goals:**
- Add a `status` field to `MatchResult` with values `'active' | 'dismissed' | 'applied'`, backwards-compatible (absent status defaults to `'active'`).
- Split the "Apply" button into "View" (opens URL, no state) and "Applied" (marks status).
- Add a "Not for me" dismiss action that hides the card and persists the `dismissed` status to the existing session matches store.
- Add a global applied store in `localStorage` (`jobify:applied`) holding applied `MatchResult` objects across all sessions.
- Add a tab switcher on `MatchesBoard` for `Matches` and `Applied` views.

**Non-Goals:**
- Supabase/server-side persistence for applied or dismissed status.
- Undo / restore dismissed vacancies.
- Preventing a dismissed vacancy from reappearing in future scans.
- Cross-device sync of applied or dismissed state.

## Decisions

### Decision: Separate global `jobify:applied` key (not embedded in session matches)

Applied status is user-level, not session-level. Storing it only in the session's match record would make it invisible when switching sessions. A separate global key is the simplest approach that satisfies the cross-session requirement without introducing server state.

*Alternatives considered:*
- Store `status: 'applied'` only in the session match record and query all session stores at board mount — rejected because it requires iterating every session's localStorage key and is fragile if sessions are deleted.
- Supabase table — rejected (user said localStorage is sufficient).

### Decision: Dismiss mutates the in-session match record only

Dismissal sets `status: 'dismissed'` on the `MatchResult` in the session's existing localStorage store (`jobify:matches:<sessionId>`). The active board filters these out at render time. No separate dismissed store is needed.

*Alternative:* Remove the match from storage entirely — rejected because it loses the AI evaluation data and makes it harder to restore in a future feature.

### Decision: Tab switcher on MatchesBoard (not a separate page/tab)

A two-tab toggle within the `MatchesBoard` component (`Matches N | Applied N`) is the least disruptive change to the navigation structure. The top-level `Navbar` tabs (`matches | profile`) remain unchanged.

### Decision: `JobCard` receives callbacks, not a global store

`JobCard` gets `onDismiss` and `onApply` callback props passed from `MatchesBoard`. State lives in `page.tsx` (already the state owner for `matches`). This follows the existing prop-down / callback-up pattern and avoids introducing context or a global store.

## Data Flow

```
page.tsx (state owner)
  ├── matches: MatchResult[]           (per active session, from localStorage)
  ├── appliedMatches: MatchResult[]    (global, from jobify:applied)
  │
  ├── handleDismiss(matchId)
  │     └── setMatches: mark status 'dismissed'
  │     └── saveSessionMatches(sessionId, updated)
  │
  └── handleApply(match)
        └── setMatches: mark status 'applied'
        └── saveSessionMatches(sessionId, updated)
        └── setAppliedMatches: prepend match
        └── saveAppliedMatch(match)        ← new global store fn

MatchesBoard
  ├── activeMatches = matches.filter(m => !m.status || m.status === 'active')
  ├── appliedMatches (prop from page.tsx)
  └── tab: 'matches' | 'applied'

JobCard
  ├── [View ↗]        → window.open(job.url)
  ├── [Applied ✓]     → onApply(match)
  └── [Not for me ✗]  → onDismiss(match.id)
```

## Storage Schema

```
localStorage key: jobify:applied
Value: MatchResult[]   (capped at 200 entries, most recent first)

Existing key: jobify:matches:<sessionId>
Value: MatchResult[]   (status field now included; absent = 'active')
```

## Risks / Trade-offs

- **Applied list can grow unbounded** → cap at 200 entries in `saveAppliedMatch`, dropping oldest. This is acceptable for typical job-search volumes.
- **Dismissed job can reappear in future scans** → explicitly accepted by the user. Documented in the spec as expected behavior.
- **No undo for dismiss** → acceptable for now; status is stored in localStorage so a future "show dismissed" feature could surface it.
- **Applied match may become stale** (job removed from provider) → no mitigation needed; the stored card is self-contained with all display data.

## Migration Plan

No schema migration needed. The `status` field is optional on `MatchResult`; existing stored records without it render as `'active'`. No deployment steps required beyond shipping the code change.
