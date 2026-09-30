# Proposal

## Why

Currently, the primary scanning button continuously reads "Scan Batch (X)" regardless of whether a search session is brand new or already active with fetched matches. This creates confusion for users who want to prefetch an initial set of vacancies, and then perform incremental updates to discover only newly published job listings. Changing the button to transition from an initial "Scan Batch (X)" prefetch state to an "Update" state once matches/checkpoints exist clarifies the application lifecycle and improves user experience.

## What Changes

- **Initial Prefetch State**: For fresh or reset sessions with no stored matches/checkpoint, display the primary action button as `"Scan Batch ({batchSize})"`.
- **Incremental Update State**: Once a session has completed its initial scan (has active matches or a stored checkpoint), transition the primary button text to `"Update"`.
- **Update Scan Trigger**: Clicking `"Update"` executes a delta scan for all newly published vacancies since the session's last checkpoint cursor timestamp.
- **Batch Size Control**: The batch size selector applies to the initial prefetch batch size. When in `"Update"` mode, the scan fetches all newly available listings up to the maximum provider page cap (100).
- **Session Reset Transition**: Resetting a search session clears its matches and checkpoint, reverting the primary scan button back to `"Scan Batch ({batchSize})"`.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `search-sessions`: Define two-stage scan button lifecycle (`"Scan Batch (X)"` for initial prefetch vs `"Update"` for incremental delta scans).

## Impact

- `src/components/MatchesBoard.tsx`: Update primary button label, state logic, and batch control UI.
- `src/app/page.tsx`: Update `handleTriggerScan` to differentiate between initial prefetch limit and update delta scan mode based on session checkpoint state.
- `openspec/specs/search-sessions/spec.md`: Update requirement scenarios for scan trigger button text and batch prefetch state transitions.
