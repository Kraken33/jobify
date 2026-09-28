# Tasks

## 1. Domain Types & Provider Implementation

- [x] 1.1 Update `src/types/index.ts` to include `'arbeitsagentur'` in `JobListing.provider` union type, and verify type checking passes with `npm run build` or `npx tsc --noEmit`.
- [x] 1.2 Implement `ArbeitsagenturProvider` in `src/lib/providers/ArbeitsagenturProvider.ts` extending `BaseJobProvider`: implement parameter serialization (`was`, `wo`, pagination), live API call to `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs` with `X-API-Key: jobboerse-jobsuche`, raw item normalization into canonical `JobListing`, `publishedAtCursor` filtering, and deterministic fallback generation. Verify by running unit tests.
- [x] 1.3 Export and register `ArbeitsagenturProvider` in `src/lib/providers/index.ts`. Verify `providerRegistry.get('arbeitsagentur')` returns the registered provider instance.
- [x] 1.4 Write unit tests in `src/__tests__/arbeitsagenturProvider.test.ts` verifying parameter mapping, normalization of raw Arbeitsagentur response structures, date cursor filtering, and deterministic fallback generation. Verify all tests pass with `npm test`.

## 2. UI & Search Session Dynamic Provider Routing

- [x] 2.1 Update `src/components/CreateSessionModal.tsx` to include a provider selector allowing the candidate to select between JustJoin.it (`justjoin`) and Bundesagentur für Arbeit (`arbeitsagentur`), persisting the selection into the created session's `provider` field. Verify the provider dropdown renders and updates session state.
- [x] 2.2 Update `src/app/page.tsx` scanning handler (`handleTriggerScan`) to pass `providerId: currentSession.provider || 'justjoin'` to the `/api/match` request instead of the hardcoded `'justjoin'`. Verify scans on an `arbeitsagentur` track target the Arbeitsagentur provider.
- [x] 2.3 Update `src/components/MatchesBoard.tsx` to display the active track's provider name or badge (e.g. "Arbeitsagentur" / "JustJoin.it") next to the track selector. Verify the UI clearly reflects which provider is being searched.

## 3. End-to-End Verification & Integration

- [x] 3.1 Run test suite with `npm test` to ensure existing regression tests and new Arbeitsagentur tests pass cleanly without errors.
- [x] 3.2 Verify Next.js build passes cleanly with `npm run build`.

## 4. Follow-up Fix: Dead-Ended First Scans on Locations Outside the German Market

- [x] 4.1 Diagnose the reported first-scan dead-end: a `wo` value the Germany-only board cannot resolve (`Poland`, `Warszawa`, `Krakow`) is answered with HTTP 200 and an empty `ergebnisliste`, so no fallback fired and `/api/match` returned zero fetched listings with the misleading baseline-constraint message. `wo=Warsaw` exposes the second shape: one on-site posting is returned for a `homeofficemoeglich=true` query and the remote hard constraint rejects it.
- [x] 4.2 Add `notice?: string` to `ProviderResult` and retry the search once without `wo` in `ArbeitsagenturProvider.fetchLiveJobs` when the located page holds no posting usable for the requested work mode, with the usability check reading the raw page so an incremental cursor is never broadened around.
- [x] 4.3 Report empty scans truthfully in `/api/match`: a provider that returned nothing is reported with `buildEmptyListingMessage`, an already-consumed page reports that there are no new postings since the last scan, and only genuinely rejected postings keep the baseline-constraint copy. Surface `notice` in the `page.tsx` scan feedback.
- [x] 4.4 Cover the widening rules with unit tests (widens once, keeps a usable location filter, never widens around the cursor, never widens without a location) and verify `npm test`, `npx tsc --noEmit` and `npm run build` all pass.
