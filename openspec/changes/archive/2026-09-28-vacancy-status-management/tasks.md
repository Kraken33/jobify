# Tasks

## 1. Types

- [x] 1.1 Add `status?: 'active' | 'dismissed' | 'applied'` to the `MatchResult` interface in `src/types/index.ts` and verify TypeScript compiles with `npx tsc --noEmit`

## 2. Applied Storage

- [x] 2.1 Add `loadAppliedMatches()`, `saveAppliedMatch(match)`, and `removeAppliedMatch(matchId)` functions to `src/lib/storage/matchStorage.ts` using the global key `jobify:applied` (cap at 200 entries, most recent first); verify by manually calling from the browser console that reads/writes persist across reloads
- [x] 2.2 Update `saveSessionMatches` to include the `status` field when serialising; verify existing matches without a `status` still load as `'active'` (backwards compat)

## 3. State Wiring in page.tsx

- [x] 3.1 Add `appliedMatches: MatchResult[]` state and load it from `loadAppliedMatches()` on mount alongside existing profile/session loading; verify the Applied count in the navbar badge (added in task 5.1) shows `0` on first load
- [x] 3.2 Implement `handleDismiss(matchId: string)` — set `status: 'dismissed'` on the match in the session store and call `saveSessionMatches`; verify dismissed card disappears from active board immediately without page reload
- [x] 3.3 Implement `handleApply(match: MatchResult)` — set `status: 'applied'` on the session match, call `saveSessionMatches`, prepend to `appliedMatches` state, and call `saveAppliedMatch`; verify match moves to Applied tab immediately
- [x] 3.4 Pass `appliedMatches`, `onDismiss`, and `onApply` as props down to `MatchesBoard`; verify TypeScript compiles cleanly

## 4. JobCard Actions

- [x] 4.1 Replace the single "Apply ↗" button in `src/components/JobCard.tsx` with three actions: **View ↗** (opens `job.url` in new tab, no state change), **Applied ✓** (calls `onApply` prop), **Not for me ✗** (calls `onDismiss` prop with `match.id`); verify all three buttons render and the old "Apply" button is gone
- [x] 4.2 Add visual state to the "Applied" button when `match.status === 'applied'` (e.g. filled green checkmark, disabled); verify applied cards in the Applied tab show the correct button state
- [x] 4.3 Update `JobCardProps` to accept `onDismiss?: (matchId: string) => void` and `onApply?: (match: MatchResult) => void`; verify TypeScript compiles cleanly

## 5. MatchesBoard Tabs

- [x] 5.1 Add a tab switcher (`Matches N | Applied N`) at the top of `src/components/MatchesBoard.tsx`; the Matches tab filters out `dismissed` and `applied` matches from the active list; verify that dismissing a card from the `Matches` tab removes it from view and the count decrements
- [x] 5.2 Add an Applied section rendered when the `applied` tab is active, listing `appliedMatches` prop (most recent first); add an empty state when the list is empty; verify switching tabs shows the correct content
- [x] 5.3 Update `MatchesBoardProps` to accept `appliedMatches: MatchResult[]`, `onDismiss`, and `onApply`, and thread them down to each `JobCard`; verify no TypeScript errors
- [x] 5.4 Hide the "Not for me" dismiss action on cards shown in the Applied tab (dismiss is only relevant in the active list); verify the Applied tab cards show only View and the applied state indicator

## 6. End-to-End Verification

- [ ] 6.1 Run a scan, dismiss one card, reload the page — verify the dismissed card is absent from the active list and the scan count is correct
- [ ] 6.2 Mark a card as applied, switch to another session, open the Applied tab — verify the applied card is present across sessions
- [ ] 6.3 Verify that the `jobify:applied` localStorage key is created and contains valid JSON after marking a vacancy as applied
