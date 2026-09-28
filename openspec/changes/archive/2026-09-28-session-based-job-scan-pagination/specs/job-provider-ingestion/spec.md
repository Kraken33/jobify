# Spec Delta

## MODIFIED Requirements

### Requirement: Extensible Job Provider Adapter Interface
The system SHALL define a standardized provider contract that accepts candidate search criteria (technology keywords, seniority level, remote preferences, and an optional pagination cursor) and returns a result envelope containing normalized job listings and an updated cursor for subsequent fetches. The cursor SHALL carry the `published_at` timestamp of the newest job in the returned batch, enabling the next call to request only jobs published after that point.

#### Scenario: Provider interface returns normalized listing structure with cursor
- **WHEN** a provider adapter fetches listings from its underlying source
- **THEN** it transforms each listing into the unified schema (title, company, description, skills tags, workplace type, canonical external URL, and `published_at` timestamp) and returns a `ProviderResult` envelope containing the listings array and a `nextCursor` reflecting the newest `published_at` in the batch

#### Scenario: Provider called with a timestamp cursor
- **WHEN** a provider is called with a non-null `publishedAtCursor` value in the search criteria
- **THEN** it fetches only listings whose `published_at` timestamp is strictly after the cursor value, effectively surfacing only new listings since the last scan

#### Scenario: Provider called without a cursor
- **WHEN** a provider is called with no cursor (null or absent `publishedAtCursor`)
- **THEN** it fetches the full current pool of listings without a date filter, and the returned `nextCursor` is set to the `published_at` of the newest listing in the result

## MODIFIED Requirements

### Requirement: JustJoin.it Provider Integration
The system SHALL implement a provider adapter for JustJoin.it that queries its public endpoints based on user tech stack tags, seniority levels, and remote work preferences, and that honours the pagination cursor by appending a date filter when one is present. When the live API is unavailable, the adapter SHALL use a deterministic multi-page fallback generator seeded by the requested page number, so that successive paginated calls return distinct listings.

#### Scenario: Fetching listings by technology and level
- **WHEN** the user initiates an ingestion run targeting specific skills (e.g., "javascript", "react") and seniority (e.g., "mid")
- **THEN** the JustJoin.it adapter queries the appropriate JustJoin.it endpoints, retrieves the newest active postings, and returns a `ProviderResult` envelope with normalized job objects and an updated cursor

#### Scenario: Fetching new listings with a cursor
- **WHEN** the adapter receives a non-null `publishedAtCursor` in the search criteria
- **THEN** it includes a date filter in the API request (or in the fallback generator) so that only postings published after the cursor timestamp are returned

#### Scenario: Multi-page fallback when API is unavailable
- **WHEN** the JustJoin.it endpoint returns a non-200 status or times out and the call includes a page offset derived from the cursor
- **THEN** the fallback generator produces a distinct set of listings for each page (seeded by page number), so that successive calls without a live API still yield different results rather than the same static set

#### Scenario: Handling provider downtime or network error
- **WHEN** the JustJoin.it endpoint returns a non-200 status or times out
- **THEN** the adapter falls back to the deterministic multi-page generator without crashing the application and includes a `fallback: true` flag in the `ProviderResult`
