# Job Provider Ingestion Specification

## Purpose
Defines an extensible job provider ingestion interface with JustJoin.it and Bundesagentur für Arbeit adapters to fetch, parse, and normalize job listings.

## Requirements

### Requirement: Extensible Job Provider Adapter Interface
The system SHALL define a standardized provider contract that accepts candidate search criteria (technology keywords, seniority level, remote preferences, spoken language criteria, and an optional pagination cursor) and returns a result envelope containing normalized job listings (including required spoken languages with CEFR levels when specified) and an updated cursor for subsequent fetches. The cursor SHALL carry the `published_at` timestamp of the newest job in the returned batch, enabling the next call to request only jobs published after that point.

#### Scenario: Provider interface returns normalized listing structure with cursor
- **WHEN** a provider adapter fetches listings from its underlying source
- **THEN** it transforms each listing into the unified schema (title, company, description, skills tags, workplace type, canonical external URL, `published_at` timestamp, and optional `spokenLanguages` array) and returns a `ProviderResult` envelope containing the listings array and a `nextCursor` reflecting the newest `published_at` in the batch

#### Scenario: Provider called with a timestamp cursor
- **WHEN** a provider is called with a non-null `publishedAtCursor` value in the search criteria
- **THEN** it fetches only listings whose `published_at` timestamp is strictly after the cursor value, effectively surfacing only new listings since the last scan

#### Scenario: Provider called without a cursor
- **WHEN** a provider is called with no cursor (null or absent `publishedAtCursor`)
- **THEN** it fetches the full current pool of listings without a date filter, and the returned `nextCursor` is set to the `published_at` of the newest listing in the result

### Requirement: JustJoin.it Provider Integration
The system SHALL implement a provider adapter for JustJoin.it that fetches live job offers. When an Apify API token is available in search criteria or runtime configuration, the adapter SHALL query JustJoin.it offers through the Apify `trev0n/justjoinit-scraper` actor. The adapter SHALL map candidate skills, seniority, work mode, and location to actor input parameters, parse returned dataset items into canonical job listing objects, extract required spoken languages (`spokenLanguages`) with CEFR levels from item fields, skill tags, or offer descriptions, and preserve cursor pagination. When no Apify token is provided or when scraping requests fail or exceed quotas, the adapter SHALL fall back to a deterministic multi-page fallback generator without crashing.

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

#### Scenario: Ingesting live offers via Apify actor with spoken language extraction
- **WHEN** search criteria contain an Apify API token and target specific skills (e.g., "javascript", "react") and seniority (e.g., "mid")
- **THEN** the adapter executes the `trev0n/justjoinit-scraper` actor with corresponding category, keyword, and experience filters, transforms returned dataset items into normalized listings with extracted `spokenLanguages`, and returns a `ProviderResult` with `fallback: false`

#### Scenario: Spoken language tags extracted from JustJoin offer data
- **WHEN** a JustJoin offer specifies language requirements in skills, raw fields, or offer body (e.g., "English B2", "Polish C2")
- **THEN** the adapter parses these requirements into structured `spokenLanguages` entries on the normalized `JobListing` object

#### Scenario: Date cursor filtering with Apify scraper
- **WHEN** the adapter runs with an Apify token and a non-null `publishedAtCursor`
- **THEN** the adapter sorts results by publication date and filters listings to those published strictly after the cursor timestamp, returning an updated cursor matching the newest listing

#### Scenario: Apify token missing or unconfigured
- **WHEN** ingestion is triggered without an Apify API token
- **THEN** the adapter gracefully invokes the deterministic multi-page fallback generator seeded by page offset, returns mock listings, and sets `fallback: true`

#### Scenario: Handling Apify scraper errors or rate limits
- **WHEN** the Apify run fails due to invalid token, insufficient compute credits (402/403), or timeout
- **THEN** the adapter catches the error, logs a diagnostic warning, falls back to the deterministic multi-page generator, and returns a `ProviderResult` with `fallback: true`

### Requirement: Bundesagentur für Arbeit Provider Integration
The system SHALL implement a provider adapter for Bundesagentur für Arbeit (arbeitsagentur.de) that queries active job listings using the official public REST API (`/pc/v6/jobs`) with the public client authentication header `X-API-Key: jobboerse-jobsuche`. The adapter SHALL serialize search criteria (target role, keywords, skills, location, work mode) into query parameters (`was`, `wo`), parse returned listings into canonical `JobListing` objects with EUR currency and home office remote flags, sort them by publication date, and preserve pagination state. Because the board only lists jobs located in Germany, a location it cannot resolve is answered with an HTTP success status and an empty or near-empty result set; the adapter SHALL then retry the search exactly once without `wo` and attach a `notice` describing the relaxation instead of reporting an empty located scan. When the remote service is unreachable or encounters an HTTP error, the adapter SHALL fall back to a deterministic multi-page fallback generator without throwing an unhandled exception.

#### Scenario: Ingesting live offers from Arbeitsagentur
- **WHEN** an ingestion scan is executed for provider `arbeitsagentur` with keywords and optional location
- **THEN** the adapter issues an HTTP request to `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs` with `X-API-Key: jobboerse-jobsuche`, transforms returned `ergebnisliste` entries into normalized `JobListing` items with provider `'arbeitsagentur'`, and returns a `ProviderResult` with `fallback: false`

#### Scenario: Date cursor filtering on Arbeitsagentur results
- **WHEN** the adapter runs with a non-null `publishedAtCursor` timestamp
- **THEN** the adapter filters incoming listings to those published or modified strictly after the cursor timestamp, returning an updated cursor matching the newest item

#### Scenario: Broadening a location the service cannot resolve
- **WHEN** a located request is answered with a success status but no posting usable for the requested work mode, whether the result set is empty or holds only on-site postings for a remote-only track
- **THEN** the adapter repeats the request exactly once without `wo`, returns the nationwide listings with `fallback: false`, and attaches a `notice` naming the location filter that was skipped

#### Scenario: Preserving the location filter when it is usable
- **WHEN** a located request returns at least one posting the track can use
- **THEN** the adapter issues a single request, keeps `wo` in the query and reports no `notice`

#### Scenario: Never broadening around the incremental cursor
- **WHEN** every posting on the located page was already consumed by `publishedAtCursor`
- **THEN** the adapter returns the empty result without issuing a second request, so the cursor keeps its meaning across scans

#### Scenario: Graceful fallback when Arbeitsagentur is unreachable
- **WHEN** the Arbeitsagentur endpoint returns a non-200 status or times out
- **THEN** the adapter logs a diagnostic warning, returns mock listings from the deterministic multi-page fallback generator seeded by page offset, and sets `fallback: true`

### Requirement: Total Vacancy Count Querying Interface
The system SHALL extend the job provider interface to support fetching or estimating the total count of active job listings matching search criteria without requiring a full job extraction scan.

#### Scenario: Querying total vacancies from Bundesagentur für Arbeit
- **WHEN** the count query is executed for provider `arbeitsagentur` with search criteria
- **THEN** the adapter issues a lightweight query to `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs` and extracts `maxErgebnisse` from the response envelope to return the total available vacancy count

#### Scenario: Querying total vacancies from JustJoin.it
- **WHEN** the count query is executed for provider `justjoin` with search criteria
- **THEN** the adapter returns the total available matching job count (from Apify dataset metadata or fallback pool total size)
