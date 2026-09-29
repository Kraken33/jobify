# Proposal: Exact Language Matching & Visible Low-Match Vacancies

## Why

Currently, vacancies that fail hard pre-filter constraints (such as work mode mismatch, seniority gap, salary threshold, or missing required spoken languages) are completely hidden and dropped from search results. Candidates cannot see available postings that partially overlap with their profile or fail a single constraint.

Additionally, the JustJoin provider adapter does not extract spoken language requirements from scraped offer data, causing jobs with explicit language requirements (e.g. English B2 + Polish C2) to pass through as full fits even when the candidate lacks one of the required languages (e.g., candidate only speaks English B2).

By extracting spoken languages from JustJoin listings, enforcing exact multi-language matching, and presenting non-matching/hard-constraint-failing vacancies at the very bottom of the scan results with a low fit score instead of hiding them, candidates get full visibility into all parsed vacancies while clearly distinguishing top fits from low-match jobs.

## What Changes

- **JustJoin Spoken Language Extraction**: Update `JustJoinProvider` to extract spoken language requirements (`spokenLanguages`) from dataset items, skill tags, or job descriptions into canonical `JobListing` objects.
- **Exact Spoken Language Matching**: Require candidates to satisfy all required spoken languages of a job at or above the required CEFR levels. Candidates missing any required language fail the language match constraint.
- **Visible Low-Match Vacancies (No Hiding)**: Modify the pre-filter pipeline in `api/match/route.ts` and `preFilter.ts` so that vacancies failing hard constraints (remote/office mismatch, seniority gap, salary threshold, spoken language requirement) are not discarded.
- **Low-Match Evaluation**: Synthesize low-match evaluation results (fit score ~25%, verdict `Low Match`, listing specific constraint gap reasons) for failing vacancies and include them in the match results.
- **Ranked Match Display**: Present all parsed vacancies sorted descending by fit score, naturally placing low-match/constraint-failing jobs at the bottom of the list.

## Capabilities

### New Capabilities

*(None)*

### Modified Capabilities

- `job-matching-engine`: Modify pre-filtering and scoring workflow to convert hard constraint failures into low-match evaluations (~25% score, verdict `Low Match`, gap explanations) and include all parsed vacancies in the sorted results instead of hiding them.
- `job-provider-ingestion`: Require `JustJoinProvider` normalization to extract and populate `spokenLanguages` on canonical `JobListing` objects.

## Impact

- **API (`/api/match`)**: Returns all parsed listings for a scan, with eligible jobs scored by AI and non-eligible/mismatched jobs included with low match evaluations (~25% fit score).
- **Matching Engine (`preFilter.ts`, `aiMatcher.ts`)**: Evaluates exact language overlap and soft-evaluates constraint mismatches.
- **Provider Layer (`JustJoinProvider.ts`)**: Extracts spoken language requirements during Apify dataset item normalization.
- **UI (`JobCard.tsx`, `JobFeed.tsx`)**: Displays all parsed vacancies in descending fit order; low match vacancies appear at the bottom with clear gap indicators.
