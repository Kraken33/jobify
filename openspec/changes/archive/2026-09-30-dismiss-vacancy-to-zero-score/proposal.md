# Proposal: Dismiss Vacancy to 0% Match Score

## Why

Currently, clicking the "Not for me" button completely removes and hides a vacancy from the matches list and marks its database status as `'dismissed'`. This creates an invisible black box where users cannot review why a vacancy was rejected, reconsider previous rejections, or maintain complete visibility over evaluated jobs. Setting the fit score to 0% retains the vacancy in the list, sinks it naturally to the bottom when sorted by fit score, preserves full AI evaluation insights, and provides an intuitive, transparent experience.

## What Changes

- Modify vacancy dismissal behavior so clicking "Not for me" updates the fit score to `0%` (`score: 0`) instead of removing the card from the active matches list.
- Update persistence logic to update `fit_score = 0` in Supabase `job_matches` while keeping status active, ensuring 0% matches persist across reloads and session switches.
- Keep standard JobCard design and badge formatting (0% match rendered in standard rose badge) while preserving original AI critique, pros, gaps, verdict, and summary.
- Hide or disable the "Not for me" action on match cards that already have a 0% score.
- Ensure minimum score filters (e.g., 60%+, 75%+, 85%+) filter out 0% matches when active, while "All Matches" (0%+) displays them at the bottom when sorted by fit score.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `vacancy-status-management`: Update Vacancy Dismissal requirement so dismissing a vacancy sets its match score to 0% and updates `fit_score = 0` in Supabase rather than hiding/excluding it from the active matches list.

## Impact

- `src/components/JobCard.tsx`: Hide or disable "Not for me" button when match score is 0.
- `src/components/MatchesBoard.tsx`: Ensure active matches include 0% matches and respect sort / minScoreFilter.
- `src/app/page.tsx`: Update `handleDismiss` callback to update in-memory match score to 0 rather than filtering out the item.
- `src/lib/storage/matchStorage.ts`: Add `updateMatchScore` (or update match score persistence to update `fit_score = 0`) in Supabase `job_matches`.
- Unit tests in `src/__tests__/`: Update vacancy status and dismissal tests to assert score 0 behavior.
