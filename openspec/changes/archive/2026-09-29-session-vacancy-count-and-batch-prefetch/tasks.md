# Tasks

## 1. Provider Layer & Backend API

- [x] 1.1 Extend `IJobProvider` interface in `src/lib/providers/JobProvider.ts` with optional `getJobCount(criteria: SearchCriteria): Promise<number | null>`. Verify type compilation.
- [x] 1.2 Implement `getJobCount` in `ArbeitsagenturProvider.ts` to perform a lightweight single-item request to the Arbeitsagentur REST API and extract `maxErgebnisse`. Verify unit test returns expected total count.
- [x] 1.3 Implement `getJobCount` in `JustJoinProvider.ts` to report total matching job count (Apify dataset metadata or fallback pool count). Verify unit test returns expected total count.
- [x] 1.4 Create API route `src/app/api/session/count/route.ts` that receives `sessionId` and `providerId`, evaluates session criteria, queries the provider `getJobCount`, and returns `{ totalVacancies }`. Verify route with unit/endpoint test.

## 2. Frontend UI & State Integration

- [x] 2.1 Add `totalVacancies` and `batchSize` state (defaulting to 20) in `MatchesBoard.tsx` and pass `limit: batchSize` when scanning.
- [x] 2.2 Add Total Vacancies & Prefetch Batch Dropdown component next to "Reset Session" in `MatchesBoard.tsx` displaying current vacancy count and active batch size.
- [x] 2.3 Implement preset options (5, 10, 20, 50) and custom batch amount input trigger ("Set Custom Batch Amount...") as the last item in the dropdown.
- [x] 2.4 Update primary scan trigger button text and handler to reflect the selected batch size (e.g. "Scan Batch (20)").
- [x] 2.5 Run test suite (`npm test`) and verify frontend rendering and end-to-end batch scanning functionality.
