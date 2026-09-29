# Proposal: Refactor Arbeitnow Provider to Use Web Search Scraping

## Why

The current `ArbeitnowProvider` fetches from `https://www.arbeitnow.com/api/job-board-api?page=1`. However, this public REST API endpoint ignores all search query parameters (`search`, `tags`, `q`, etc.) and returns only an unfiltered, chronological feed of the ~325 newest postings across all industries. When users search for specific tech keywords (e.g. `"javascript"`) or tags (e.g. `"english speaking"`), local in-memory filtering of those ~325 items yields zero or highly irrelevant vacancies.

Refactoring `ArbeitnowProvider` to fetch and parse Arbeitnow's web search endpoint (`https://www.arbeitnow.com/?search=...`) enables true server-side full-text search and tag filtering, matching the relevant results returned on the Arbeitnow website.

## What Changes

- **Refactor `ArbeitnowProvider` request engine**: Construct web search queries targeting `https://www.arbeitnow.com/?search={keywords}&tags={tags}&sort_by=relevance&page={page}` when search criteria are provided.
- **Implement HTML job card parser**: Extract job titles, company names, locations, tags, detail URLs, and descriptions directly from web search HTML results (`data-job-item-link="true"` cards and structured microdata).
- **Maintain fallback capabilities**: Preserve fallback to `/api/job-board-api` or `arbeitnowFallbackPool` for offline testing, network errors, or broad unfiltered scans.
- **Update vacancy count querying**: Update `getJobCount` to extract total matching vacancies from search page metadata.

## Capabilities

### Modified Capabilities

- `job-provider-ingestion`: Update Arbeitnow provider ingestion requirements to use web search URL parameters (`search`, `tags`), parse HTML search result cards, and extract candidate requirements.

## Impact

- `src/lib/providers/ArbeitnowProvider.ts`: Modified to parse HTML web search results when keywords or tags are present.
- `src/lib/providers/ArbeitnowProvider.test.ts`: Updated test suite for HTML response parsing and fallback logic.
