# Proposal

## Why

Job seekers across international and regional job markets (such as DACH and EU) require precise matching based on spoken language capabilities and European Framework (CEFR) levels (A1 to C2, Native). Currently, job searches lack structured spoken language criteria, causing candidates to waste time reviewing or AI-evaluating listings for which they do not meet mandatory language proficiency thresholds.

## What Changes

- Add a structured `SpokenLanguage` data type (`language` name + `level` ranging from A1 to C2, Native).
- Extend `CandidateProfile` to support managing candidate spoken languages and proficiency levels.
- Extend `SearchSession` and `SearchCriteria` to store and pass spoken language requirements for provider queries.
- Update `computeProviderFingerprint` to incorporate spoken language criteria so cursor pagination and caches reset when language parameters change.
- Update provider ingestion (`JustJoinProvider`, `ArbeitsagenturProvider`, and fallback job pools) to extract and normalize job spoken language requirements.
- Enhance `evaluateHardConstraints` in pre-filtering to enforce spoken language level hierarchy ($L_{\text{candidate}} \ge L_{\text{job}}$), skipping listings where candidate proficiency is insufficient.
- Include candidate and job spoken language details in `AiMatcherService` prompt context for LLM scoring.
- Update UI components (`ProfileForm`, `CreateSessionModal`, `JobCard`) to allow adding/editing languages and displaying language badges on job cards.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `candidate-profile`: Extend candidate profile configuration to persist candidate spoken languages and CEFR levels.
- `search-sessions`: Support spoken language criteria as session search parameters.
- `job-provider-ingestion`: Include normalized spoken language requirements on canonical `JobListing` objects.
- `job-matching-engine`: Include spoken language proficiency hierarchy checks in hard pre-filtering, include languages in provider query fingerprints, and forward language context to OpenAI scoring.

## Impact

- `src/types/index.ts`: Added `SpokenLanguageLevel` and `SpokenLanguage` interfaces; updated `CandidateProfile`, `JobListing`, `SearchCriteria`, and `SearchSession`.
- `src/lib/matching/preFilter.ts`: Added language level comparison logic in `evaluateHardConstraints`.
- `src/lib/providers/fingerprint.ts`: Included spoken languages in `computeProviderFingerprint`.
- `src/lib/matching/aiMatcher.ts`: Expanded prompt payload with spoken language details.
- `src/lib/providers/`: Updated provider adapters and fallback pools with language requirements.
- `src/components/`: Updated `ProfileForm`, `CreateSessionModal`, and `JobCard` components.
