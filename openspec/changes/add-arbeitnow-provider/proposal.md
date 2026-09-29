# Proposal: Add Arbeitnow Job Provider

## Why

Arbeitnow (`arbeitnow.com`) offers a high-quality, free, open REST API providing English-speaking and remote-friendly software engineering and technology vacancies across Germany and Europe without requiring API key authorization or rate limit restrictions. Adding Arbeitnow as a native ingestion adapter expands candidate job coverage alongside existing providers (JustJoin.it and Bundesagentur für Arbeit) while keeping search latency low and reliable.

## What Changes

- Add a new `ArbeitnowProvider` class implementing `IJobProvider` to fetch live vacancies via `https://www.arbeitnow.com/api/job-board-api`.
- Parse Arbeitnow listing fields (`title`, `company_name`, `description`, `location`, `remote`, `tags`, `job_types`, `url`, `created_at`) into unified `JobListing` objects.
- Extract required spoken languages (and CEFR levels) from job descriptions and tags.
- Implement `publishedAtCursor` filtering using UNIX `created_at` timestamps for incremental delta loading across search sessions.
- Implement `getJobCount` for Arbeitnow using `meta.total` from the API response envelope.
- Implement a deterministic multi-page fallback pool (`arbeitnowFallbackPool`) for offline testing and runtime resilience.
- Register `ArbeitnowProvider` into `ProviderRegistry` and update UI provider options.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `job-provider-ingestion`: Extend the job provider ingestion specification to require integration with the Arbeitnow REST API (`arbeitnow.com`), mapping job listings to unified schemas, extracting spoken language requirements, preserving timestamp cursor pagination, and querying total vacancy counts.

## Impact

- `src/lib/providers/ArbeitnowProvider.ts`: [NEW] Arbeitnow provider adapter.
- `src/lib/providers/arbeitnowFallbackPool.ts`: [NEW] Fallback pool for Arbeitnow.
- `src/lib/providers/index.ts`: Export and register `ArbeitnowProvider` in `ProviderRegistry`.
- `src/types/index.ts`: Add `'arbeitnow'` to provider identifier types.
- Search criteria UI components: Include Arbeitnow in active provider checkboxes and search options.
