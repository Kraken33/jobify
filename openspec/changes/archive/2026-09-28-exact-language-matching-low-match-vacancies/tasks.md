# Tasks

## 1. JustJoin Provider Spoken Language Extraction

- [x] 1.1 Implement language extraction logic in `JustJoinProvider.ts` to parse spoken languages and CEFR levels from skills, tags, and offer descriptions, verifying with new unit tests in `src/__tests__/justJoinProvider.test.ts`.
- [x] 1.2 Update `normalizeApifyItem` and `normalizeOffer` in `JustJoinProvider.ts` to assign `spokenLanguages` to normalized `JobListing` objects and verify tests pass.

## 2. Hard Constraint Evaluation & Soft Match Pipeline

- [x] 2.1 Verify and update `evaluateHardConstraints` in `src/lib/matching/preFilter.ts` to strictly require all job spoken languages to be matched by candidate profile spoken languages at or above required CEFR levels, passing updated tests in `src/__tests__/preFilter.test.ts`.
- [x] 2.2 Refactor `/api/match/route.ts` to partition unseen listings into eligible vs constraint-failing jobs, creating synthetic low-match results (score 25%, verdict `Low Match`, gap details) for failing jobs instead of dropping them.
- [x] 2.3 Merge AI-scored results and synthetic low-match results in `/api/match/route.ts` sorted by score descending, verifying via match API tests that low matches are included at the bottom.

## 3. End-to-End Verification

- [x] 3.1 Run unit and integration tests (`npm test`) to confirm that all test suites pass, verifying exact language matching and unhidden low-match vacancy behavior across providers.
