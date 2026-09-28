# Tasks

## 1. Domain Types & Models Update

- [x] 1.1 Add `SpokenLanguageLevel` and `SpokenLanguage` interface in `src/types/index.ts`, and update `CandidateProfile`, `JobListing`, `SearchCriteria`, `SearchSession` models. Verify by running `npx tsc --noEmit`.

## 2. Pre-filtering & Matching Engine Core Logic

- [x] 2.1 Update `src/lib/matching/preFilter.ts` with CEFR numerical comparison logic (`A1: 1` through `Native: 7`) and enforce language checks in `evaluateHardConstraints`. Verify by running unit tests in `npm test`.
- [x] 2.2 Update `src/lib/providers/fingerprint.ts` to incorporate `spokenLanguages` into `computeProviderFingerprint`. Verify hash calculation with test assertions.
- [x] 2.3 Update `src/lib/matching/aiMatcher.ts` to pass spoken languages into OpenAI evaluation prompt. Verify by reviewing formatted prompt payload.

## 3. Provider Data Ingestion & Fallbacks

- [x] 3.1 Update `JustJoinProvider.ts`, `ArbeitsagenturProvider.ts`, `fallbackPool.ts`, and `arbeitsagenturFallbackPool.ts` to parse and include normalized `spokenLanguages`. Verify with provider unit tests.

## 4. UI Components & User Experience

- [x] 4.1 Update `src/components/ProfileForm.tsx` to add UI controls for editing spoken languages with CEFR dropdowns. Verify component renders and saves without errors.
- [x] 4.2 Update `src/components/CreateSessionModal.tsx` to allow adding/inheriting spoken language search parameters for sessions. Verify session creation behavior.
- [x] 4.3 Update `src/components/JobCard.tsx` to render language requirement pills/badges. Verify job cards display language badges cleanly.
