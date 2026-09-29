# Tasks

## 1. Type Definitions & Storage Models

- [x] 1.1 Add `targetRole?: string` to `SearchCriteria` and `SearchSession` in `src/types/index.ts` and verify TypeScript compilation with `npx tsc --noEmit`
- [x] 1.2 Update `src/lib/storage/sessionStorage.ts` to persist and restore `targetRole` in `createImplicitSession`, `loadSessions`, and `saveSession`, and verify with `npm test src/__tests__/sessionStorage.test.ts`

## 2. Arbeitnow Provider Adapter & Search URL Formatting

- [x] 2.1 Update `ArbeitnowProvider.hasSearchTerms` in `src/lib/providers/ArbeitnowProvider.ts` to check `criteria.targetRole` and `criteria.providerHints?.arbeitnow?.endpoint` in addition to keywords and language tags
- [x] 2.2 Update `ArbeitnowProvider.buildSearchUrl` in `src/lib/providers/ArbeitnowProvider.ts` to use `sort_by=null`, `date_posted=all`, target role for `search`, and serialized JSON array `tags` (e.g. `["english speaking"]` for `english-speaking-jobs`)
- [x] 2.3 Ensure `ArbeitnowProvider` uses `targetRole` or `keywords` for search terms without injecting `criteria.skills` into provider search parameters
- [x] 2.4 Update and expand `src/__tests__/arbeitnowProvider.test.ts` to test endpoint URLs with English tags, `sort_by=null`, `date_posted=all`, and target role keywords, verifying with `npm test src/__tests__/arbeitnowProvider.test.ts`

## 3. Provider Search Role Resolution & API Route Integration

- [x] 3.1 Update `JustJoinProvider.ts` and `ArbeitsagenturProvider.ts` to resolve search keywords from `criteria.targetRole` / `criteria.keywords` and remove fallback to `criteria.skills`
- [x] 3.2 Update `src/app/api/match/route.ts` and `src/app/api/session/count/route.ts` to forward `targetRole`, `spokenLanguages`, and `providerHints` into provider `searchJobs` and `getJobCount` calls
- [x] 3.3 Update `src/components/CreateSessionModal.tsx` to include `targetRole` in created session payloads (inherited from candidate profile)
- [x] 3.4 Verify provider unit tests (`npm test src/__tests__/justJoinProvider.test.ts` and `npm test src/__tests__/arbeitsagenturProvider.test.ts`) pass with role-based keyword searches

## 4. Integration Verification

- [x] 4.1 Run the full test suite with `npm test` to ensure all provider tests, route tests, and storage tests pass cleanly
