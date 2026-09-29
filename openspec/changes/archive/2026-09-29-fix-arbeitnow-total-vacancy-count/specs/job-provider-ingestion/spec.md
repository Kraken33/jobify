# Spec Delta

## MODIFIED Requirements

### Requirement: Arbeitnow Provider Integration
The system SHALL implement a provider adapter for Arbeitnow (`arbeitnow.com`) that queries job listings matching candidate search criteria. When search criteria (keywords, skills, or language tags) are present, the adapter SHALL construct web search requests with `sort_by=newest` to ensure results are ordered by publication date (newest first) and parse HTML search result cards (`data-job-item-link="true"` elements and microdata) into canonical `JobListing` objects (including `title`, `company`, `description`, `city`, `isRemote`, `url`, `tags`, and publication dates). When no search keywords or tags are present or web search parsing encounters errors, the adapter MAY fall back to the public REST API (`https://www.arbeitnow.com/api/job-board-api`) or deterministic fallback generator without throwing an unhandled exception. The adapter SHALL extract required spoken languages (`spokenLanguages`) with CEFR levels from item tags and descriptions, and maintain cursor pagination.

The adapter SHALL support provider-specific endpoint selection via `providerHints.arbeitnow.endpoint` in `SearchCriteria`. When this hint is present, the adapter SHALL use that value as the URL path segment AND inject any tag implicitly associated with that endpoint into the `tags` query parameter alongside any candidate-derived tags. The endpoint-to-tag mapping is: `english-speaking-jobs` → `"english speaking"`, `visa-sponsorship-jobs` → `"visa sponsorship"`. Endpoints with no associated tag (`jobs-with-salary`, `4-day-work-week-jobs`, `jobs-with-relocation`) only change the path and do not inject any implicit tag. When the hint is absent or empty, the adapter SHALL fall back to the generic root endpoint without injecting implicit tags.

When querying total vacancies via `getJobCount` with search criteria, the adapter SHALL extract the total count by parsing the embedded JavaScript pagination state object (`let data = {...}`) from the search page HTML, reading `data.total` (or calculating `data.last_page * data.per_page` when `total` is missing). If embedded script parsing fails, the adapter MAY fall back to matching plain-text vacancy summary patterns in the DOM HTML or querying the public REST API envelope.

#### Scenario: Ingesting live offers from Arbeitnow web search
- **WHEN** an ingestion scan is executed for provider `arbeitnow` with search criteria containing keywords or tags (e.g. "javascript" with "english speaking")
- **THEN** the adapter issues an HTTP request to `https://www.arbeitnow.com/?search=javascript&tags=%5B%22english+speaking%22%5D&sort_by=newest&date_posted=all&page=1`, parses HTML search result cards into canonical `JobListing` items with provider `'arbeitnow'`, extracts spoken language requirements, and returns a `ProviderResult` with `fallback: false`

#### Scenario: Using a provider-specific endpoint hint
- **WHEN** an ingestion scan is executed for provider `arbeitnow` with `providerHints.arbeitnow.endpoint` set to `english-speaking-jobs` and a keyword (e.g. `"javascript"`)
- **THEN** the adapter issues an HTTP request combining the endpoint path and its implicit tag: `https://www.arbeitnow.com/english-speaking-jobs?search=javascript&tags=%5B%22english+speaking%22%5D&sort_by=newest&...`, and returns a `ProviderResult` with `fallback: false`

#### Scenario: Date cursor filtering on Arbeitnow search results
- **WHEN** the adapter runs with a non-null `publishedAtCursor` timestamp
- **THEN** the adapter filters incoming Arbeitnow listings to those published strictly after the cursor timestamp, returning an updated cursor matching the newest item's `publishedAt`

#### Scenario: Spoken language extraction from Arbeitnow search results
- **WHEN** an Arbeitnow job listing contains language tags or explicit language requirements in its HTML card or detail page (e.g. "German required", "fluent English")
- **THEN** the adapter parses these requirements into structured `spokenLanguages` entries with corresponding CEFR levels

#### Scenario: Graceful fallback when Arbeitnow web search is unreachable
- **WHEN** the Arbeitnow website request returns a non-200 status or times out
- **THEN** the adapter falls back to the public REST API or deterministic multi-page fallback generator without throwing an unhandled exception and sets `fallback: true`

#### Scenario: Querying total vacancies from Arbeitnow embedded script metadata
- **WHEN** the count query `getJobCount` is executed for provider `arbeitnow` with search criteria
- **THEN** the adapter parses the embedded script variable (`let data = {...}`) from the returned search HTML page and extracts `data.total` (or `data.last_page * data.per_page`) as the total matching vacancy count
