# Spec Delta: Job Provider Ingestion

## MODIFIED Requirements

### Requirement: JustJoin.it Provider Integration
The system SHALL implement a provider adapter for JustJoin.it that fetches live job offers. When an Apify API token is available in search criteria or runtime configuration, the adapter SHALL query JustJoin.it offers through the Apify `trev0n/justjoinit-scraper` actor. The adapter SHALL map candidate skills, seniority, work mode, and location to actor input parameters, parse returned dataset items into canonical job listing objects, and preserve cursor pagination. When no Apify token is provided or when scraping requests fail or exceed quotas, the adapter SHALL fall back to a deterministic multi-page fallback generator without crashing.

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

#### Scenario: Ingesting live offers via Apify actor with client token
- **WHEN** search criteria contain an Apify API token and target specific skills (e.g., "javascript", "react") and seniority (e.g., "mid")
- **THEN** the adapter executes the `trev0n/justjoinit-scraper` actor with corresponding category, keyword, and experience filters, transforms returned dataset items into normalized listings, and returns a `ProviderResult` with `fallback: false`

#### Scenario: Date cursor filtering with Apify scraper
- **WHEN** the adapter runs with an Apify token and a non-null `publishedAtCursor`
- **THEN** the adapter sorts results by publication date and filters listings to those published strictly after the cursor timestamp, returning an updated cursor matching the newest listing

#### Scenario: Apify token missing or unconfigured
- **WHEN** ingestion is triggered without an Apify API token
- **THEN** the adapter gracefully invokes the deterministic multi-page fallback generator seeded by page offset, returns mock listings, and sets `fallback: true`

#### Scenario: Handling Apify scraper errors or rate limits
- **WHEN** the Apify run fails due to invalid token, insufficient compute credits (402/403), or timeout
- **THEN** the adapter catches the error, logs a diagnostic warning, falls back to the deterministic multi-page generator, and returns a `ProviderResult` with `fallback: true`
