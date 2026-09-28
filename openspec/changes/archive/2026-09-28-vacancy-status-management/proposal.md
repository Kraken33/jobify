# Proposal

## Why

Users currently have no way to act on job matches beyond clicking a single "Apply" button that merely opens the external URL — making it impossible to distinguish vacancies they have already applied to from ones they have simply viewed or decided to skip. This creates noise in the matches list and offers no lightweight application pipeline tracking.

## What Changes

- Add a `status` field (`'active' | 'dismissed' | 'applied'`) to `MatchResult` (backwards-compatible, defaults to `'active'`).
- Replace the single "Apply" button on each `JobCard` with two separate actions:
  - **View** — opens the external job URL in a new tab (no state change).
  - **Applied** — marks the vacancy as applied and moves it to the global Applied list.
- Add a **"Not for me"** dismiss action on each `JobCard` that sets status to `'dismissed'` and hides the card from the active matches board.
- Add a **global Applied tab/section** to the Matches Board showing all applied vacancies across all search sessions.
- Persist applied vacancies in `localStorage` under a single global key (`jobify:applied`) independent of session.
- Dismissed vacancies are hidden from the active board; their IDs are not written to `seenJobIds` (dismiss is display-only, reversible within the session if needed).

## Capabilities

### New Capabilities

- `vacancy-status-management`: User-driven lifecycle actions on job match cards — dismiss (hide from active board) and mark as applied (move to global Applied list).

### Modified Capabilities

- `job-matching-engine`: The ranked matches display requirement is changing — the "Apply" external link is now separated into a "View" link and an "Applied" status action, and the display layer gains filtering for dismissed cards.

## Impact

- `src/types/index.ts` — add `status` field to `MatchResult`.
- `src/components/JobCard.tsx` — replace "Apply" button with "View" + "Applied" + "Not for me" actions; apply visual state for applied/dismissed cards.
- `src/components/MatchesBoard.tsx` — filter out `dismissed` matches from active list; add Applied tab showing global applied list.
- `src/lib/storage/matchStorage.ts` — update `saveSessionMatches` to persist status; add global applied storage functions (`loadAppliedMatches`, `saveAppliedMatch`, `removeAppliedMatch`).
- `src/app/page.tsx` — wire dismiss and applied handlers; load global applied list on mount.
