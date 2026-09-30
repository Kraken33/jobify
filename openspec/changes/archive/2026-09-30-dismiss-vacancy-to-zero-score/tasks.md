# Tasks

## 1. Storage Layer

- [x] 1.1 Implement `updateMatchScore(matchId, score, providerJobId)` in `src/lib/storage/matchStorage.ts` to update `fit_score` in Supabase `job_matches` table.
- [x] 1.2 Update unit tests in `src/__tests__/matchStorage.test.ts` to test updating match fit score and verify with `npm test`.

## 2. UI & Card Action Handling

- [x] 2.1 Update `handleDismiss` in `src/app/page.tsx` to optimistically update match `evaluation.score = 0` and persist score via `updateMatchScore`.
- [x] 2.2 Update `src/components/JobCard.tsx` to hide the "Not for me" dismiss button when `match.evaluation.score === 0`.
- [x] 2.3 Verify sorting and filtering in `MatchesBoard.tsx` (0% matches sink to the bottom on score sort, and are excluded when minScoreFilter > 0).

## 3. Integration & Validation

- [x] 3.1 Run `npm test` and verify that all test suites pass cleanly.
