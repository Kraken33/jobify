# Tasks

## 1. UI Component Updates (MatchesBoard)

- [x] 1.1 In `src/components/MatchesBoard.tsx`, determine `isUpdateMode` based on whether the active session has stored matches or an active checkpoint cursor, and render button text as `"Update"` when in update mode versus `"Scan Batch ({batchSize})"` when in initial prefetch mode. Verify TypeScript compiles without errors (`npx tsc --noEmit`).
- [x] 1.2 In `src/components/MatchesBoard.tsx`, update the primary button click handler to pass the appropriate limit (`batchSize` for initial prefetch, `100` for update mode) to `onTriggerScan`. Verify button label changes dynamically when matches are added or cleared.

## 2. Scan Handler & Feedback Logic (Main Application Page)

- [x] 2.1 In `src/app/page.tsx`, update `handleTriggerScan` to evaluate session update state and apply initial batch prefetch limit versus update delta limit (100). Verify via `npx tsc --noEmit`.
- [x] 2.2 In `src/app/page.tsx`, update completion messages to differentiate initial prefetch evaluation feedback from update scan status (`"Successfully updated! Evaluated N new positions!"` / `"You're up to date!"`). Verify UI toasts render correctly.

## 3. Testing & Verification

- [x] 3.1 Create/update unit tests in `src/__tests__/scanFlowState.test.ts` to test initial prefetch limit vs update delta scan limit logic and button state reset on session reset. Run `npm test` to verify all tests pass.
