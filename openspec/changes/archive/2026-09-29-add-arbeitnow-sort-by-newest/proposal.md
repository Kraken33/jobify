# Proposal

## Why

Currently, the `ArbeitnowProvider` queries search results with `sort_by=null` (or default relevance sorting) on Arbeitnow web search URLs. Setting `sort_by=newest` ensures that search requests explicitly request job vacancies ordered by publication date (newest first), ensuring candidate searches surface the most recent job postings.

## What Changes

- Modify `ArbeitnowProvider.buildSearchUrl` to set the URL query parameter `sort_by=newest` instead of `sort_by=null`.
- Update tests for `ArbeitnowProvider` to verify that search URLs constructed by `buildSearchUrl` include `sort_by=newest`.
- Update `job-provider-ingestion` spec scenarios to specify `sort_by=newest` for Arbeitnow search URLs.

## Capabilities

### New Capabilities

*(None)*

### Modified Capabilities

- `job-provider-ingestion`: Update Arbeitnow provider web search requirements and scenarios to specify `sort_by=newest`.

## Impact

- `src/lib/providers/ArbeitnowProvider.ts`: `buildSearchUrl` query string generation.
- `src/__tests__/arbeitnowProvider.test.ts`: Test assertions for generated search URLs.
- `openspec/specs/job-provider-ingestion/spec.md`: Delta spec updating Arbeitnow web search URL parameter requirements.
