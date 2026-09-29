# Spec Delta: Job Provider Ingestion

## ADDED Requirements

### Requirement: Arbeitnow Provider Integration
The system SHALL implement a provider adapter for Arbeitnow (`arbeitnow.com`) that queries active job listings using the public JSON API (`https://www.arbeitnow.com/api/job-board-api`). The adapter SHALL map returned job items into canonical `JobListing` objects (including `title`, `company_name`, `description`, `location`, `remote`, `tags`, `job_types`, `url`, and UNIX `created_at` timestamp transformed to ISO format), extract required spoken languages (`spokenLanguages`) with CEFR levels from item fields and descriptions, and preserve timestamp cursor pagination using the UNIX timestamp (`created_at`). When the public API endpoint returns a non-200 status or encounters a network error, the adapter SHALL fall back to a deterministic multi-page fallback generator without throwing an unhandled exception.

#### Scenario: Ingesting live offers from Arbeitnow API
- **WHEN** an ingestion scan is executed for provider `arbeitnow` with search criteria (e.g., technology keywords and remote preference)
- **THEN** the adapter issues an HTTP GET request to `https://www.arbeitnow.com/api/job-board-api`, transforms returned `data` array entries into normalized `JobListing` items with provider `'arbeitnow'`, extracts spoken language requirements, and returns a `ProviderResult` envelope with `fallback: false`

#### Scenario: Date cursor filtering on Arbeitnow results
- **WHEN** the adapter runs with a non-null `publishedAtCursor` timestamp
- **THEN** the adapter filters incoming Arbeitnow listings to those published strictly after the cursor timestamp, returning an updated cursor matching the newest item's `created_at`

#### Scenario: Spoken language extraction from Arbeitnow descriptions and tags
- **WHEN** an Arbeitnow job listing contains language tags or explicit language requirements in its HTML description (e.g. "German required", "fluent English")
- **THEN** the adapter extracts these requirements into structured `spokenLanguages` entries on the normalized `JobListing` object

#### Scenario: Graceful fallback when Arbeitnow is unreachable
- **WHEN** the Arbeitnow API endpoint returns a non-200 status or times out
- **THEN** the adapter logs a diagnostic warning, returns mock listings from the deterministic multi-page fallback generator seeded by page offset, and sets `fallback: true`

## MODIFIED Requirements

### Requirement: Total Vacancy Count Querying Interface
The system SHALL extend the job provider interface to support fetching or estimating the total count of active job listings matching search criteria without requiring a full job extraction scan.

#### Scenario: Querying total vacancies from Bundesagentur für Arbeit
- **WHEN** the count query is executed for provider `arbeitsagentur` with search criteria
- **THEN** the adapter issues a lightweight query to `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs` and extracts `maxErgebnisse` from the response envelope to return the total available vacancy count

#### Scenario: Querying total vacancies from JustJoin.it
- **WHEN** the count query is executed for provider `justjoin` with search criteria
- **THEN** the adapter returns the total available matching job count (from Apify dataset metadata or fallback pool total size)

#### Scenario: Querying total vacancies from Arbeitnow
- **WHEN** the count query is executed for provider `arbeitnow` with search criteria
- **THEN** the adapter queries the Arbeitnow API endpoint and extracts `meta.total` from the response envelope to return the total available vacancy count
