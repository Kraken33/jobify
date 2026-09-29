# Tasks

## 1. Backend Route Updates

- [x] 1.1 Update `src/app/api/match/route.ts` to accept optional `session?: SearchSession` in the request payload and prioritize it over `loadSessions` / `createImplicitSession`. Verify with unit tests.
- [x] 1.2 Update `src/app/api/session/count/route.ts` to accept optional `session?: SearchSession` in the request payload and prioritize it over `loadSessions` / `createImplicitSession`. Verify with unit tests.
- [x] 1.3 Add test in `src/__tests__/sessionPayloadForwarding.test.ts` verifying that `/api/match` and `/api/session/count` pass `session.targetRole` and `session.providerOptions` (e.g. Arbeitnow endpoint) to provider adapters when `session` is provided in the request body.

## 2. Frontend Client Updates

- [x] 2.1 Update `src/app/page.tsx` (`handleTriggerScan`) to include `session: currentSession` in the POST request body sent to `/api/match`. Verify the client bundle compiles and scans work as expected.
- [x] 2.2 Update `src/components/MatchesBoard.tsx` (`fetchTotalVacancies`) to include `session: activeSession` in the POST request body sent to `/api/session/count`. Verify vacancy count requests send the active session payload.

## 3. Integration Verification

- [x] 3.1 Run unit and integration tests (`npm test` or `node --test`) to verify all match, count, and provider tests pass.
