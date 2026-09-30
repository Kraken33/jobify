# Job Provider Ingestion Specification

## Purpose
Defines an extensible job provider ingestion interface with JustJoin.it and Bundesagentur für Arbeit adapters to fetch, parse, and normalize job listings.

## Requirements

### Requirement: Extensible Job Provider Adapter Interface
The system SHALL define a standardized provider contract that accepts candidate search criteria (target role / job title keywords, seniority level, remote preferences, spoken language criteria, provider-specific hints, and an optional pagination cursor) and returns a result envelope containing normalized job listings (including required spoken languages with CEFR levels when specified) and an updated cursor for subsequent fetches. The cursor SHALL carry the `published_at` timestamp of the newest job in the returned batch, enabling the next call to request only jobs published after that point. Provider adapters SHALL query remote job boards using the target role or job title keywords rather than candidate skill lists; candidate skill lists SHALL be evaluated during post-ingestion fit matching rather than sent as restrictive provider search terms.

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
The system SHALL implement a provider adapter for JustJoin.it that fetches live job offers. When an Apify API token is available in search criteria or runtime configuration, the adapter SHALL query JustJoin.it offers through the Apify `trev0n/justjoinit-scraper` actor. The adapter SHALL map target job title / role keyword, seniority, work mode, and location to actor input parameters, parse returned dataset items into canonical job listing objects, extract required spoken languages (`spokenLanguages`) with CEFR levels from item fields, all tech stack skill arrays (`requiredSkills`, `skills`, `niceToHave`, `techStack`, `tech_stack`, `skills_tags`), or offer descriptions, and preserve cursor pagination. When no Apify token is provided or when scraping requests fail or exceed quotas, the adapter SHALL fall back to a deterministic multi-page fallback generator without crashing.

The adapter SHALL apply spoken-language pre-filtering during Apify input construction: when the candidate's search criteria include `spokenLanguages`, and the actor supports a language filter parameter (e.g., `languages`), the adapter SHALL include only the candidate's known language codes in the actor input to reduce language-mismatched listings at the source. If the actor does not support such a filter or the parameter has no effect, this requirement does not apply and language filtering falls back to client-side pre-filtering only.

The adapter's `extractSpokenLanguages` function SHALL correctly identify language requirements from JustJoin offer data across all tech stack arrays (`requiredSkills`, `skills`, `niceToHave`, `techStack`, `tech_stack`, `skills_tags`) and vacancy descriptions. It SHALL inspect both string skill tags and object properties (`name`, `level`, `value`, `title`) to catch languages in tech stack items (e.g. `Polish (B2)`, `{ name: 'Język polski', level: 'C1' }`). It SHALL NOT treat two-letter technical skill abbreviations (e.g., `pl` as a skill tag for programming language or framework) as Polish language requirements unless whole-token matching confirms spoken language intent. It SHALL detect explicit language requirements in description text (e.g., "fluent English", "Polish required", "komunikatywność po angielsku") and map them to structured `SpokenLanguage` entries with appropriate CEFR levels.

#### Scenario: Spoken language tags extracted from tech stack arrays and objects
- **WHEN** a JustJoin offer specifies language requirements in any tech stack array (`requiredSkills`, `skills`, `niceToHave`, `techStack`, `tech_stack`, `skills_tags`) or as objects with `level`/`value` properties (e.g., `{ name: 'Polish', level: 'C1' }`)
- **THEN** the adapter merges all tech stack sources and parses these requirements into structured `spokenLanguages` entries on the normalized `JobListing` object

#### Scenario: Technical abbreviation not confused with spoken language
- **WHEN** a JustJoin offer has a skill tag such as `pl` (referring to Perl or another programming language or tool) or similar two-letter abbreviation without an explicit spoken language context
- **THEN** the adapter does NOT create a `spokenLanguages` entry for Polish (or any other language) based on that tag alone

#### Scenario: Spoken language filter passed to Apify actor when supported
- **WHEN** the candidate's search criteria include `spokenLanguages` (e.g., English B2) and an Apify token is present
- **THEN** the adapter includes the candidate's language codes in the Apify actor input to narrow results towards listings matching those languages

#### Scenario: Fetching listings by technology and level
- **WHEN** the user initiates an ingestion run targeting a specific role or keywords (e.g., "Frontend Developer") and seniority (e.g., "mid")
- **THEN** the JustJoin.it adapter queries the appropriate JustJoin.it endpoints using the role keyword, retrieves the newest active postings, and returns a `ProviderResult` envelope with normalized job objects and an updated cursor

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
- **WHEN** search criteria contain an Apify API token and target a specific role and seniority (e.g., "mid")
- **THEN** the adapter executes the `trev0n/justjoinit-scraper` actor with corresponding keyword and experience filters, transforms returned dataset items into normalized listings with extracted `spokenLanguages`, and returns a `ProviderResult` with `fallback: false`

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
The system SHALL implement a provider adapter for Bundesagentur für Arbeit (arbeitsagentur.de) that queries active job listings using the official public REST API (`/pc/v6/jobs`) with the public client authentication header `X-API-Key: jobboerse-jobsuche`. The adapter SHALL serialize search criteria (target role or keywords, location, work mode) into query parameters (`was`, `wo`), parse returned listings into canonical `JobListing` objects with EUR currency and home office remote flags, sort them by publication date, and preserve pagination state. Because the board only lists jobs located in Germany, a location it cannot resolve is answered with an HTTP success status and an empty or near-empty result set; the adapter SHALL then retry the search exactly once without `wo` and attach a `notice` describing the relaxation instead of reporting an empty located scan. When the remote service is unreachable or encounters an HTTP error, the adapter SHALL fall back to a deterministic multi-page fallback generator without throwing an unhandled exception.

#### Scenario: Ingesting live offers from Arbeitsagentur
- **WHEN** an ingestion scan is executed for provider `arbeitsagentur` with target role / keywords and optional location
- **THEN** the adapter issues an HTTP request to `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs` with `X-API-Key: jobboerse-jobsuche` and `was` set to target role / keyword, transforms returned `ergebnisliste` entries into normalized `JobListing` items with provider `'arbeitsagentur'`, and returns a `ProviderResult` with `fallback: false`

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

### Requirement: Arbeitnow Provider Integration
The system SHALL implement a provider adapter for Arbeitnow (`arbeitnow.com`) that queries job listings matching candidate search criteria. When search criteria (keywords, skills, or language tags) are present, the adapter SHALL construct web search requests with `sort_by=newest` to ensure results are ordered by publication date (newest first) and parse HTML search result cards (`data-job-item-link="true"` elements and microdata) into canonical `JobListing` objects (including `title`, `company`, `description`, `city`, `isRemote`, `url`, `tags`, and publication dates). The adapter SHALL parse the exact publication datetime from `<time datetime="...">` elements inside the HTML card (e.g. `<time datetime="2026-09-30 15:00:30">`) to establish accurate ISO publication timestamps (`publishedAt`). When no search keywords or tags are present or web search parsing encounters errors, the adapter MAY fall back to the public REST API (`https://www.arbeitnow.com/api/job-board-api`) or deterministic fallback generator without throwing an unhandled exception. The adapter SHALL extract required spoken languages (`spokenLanguages`) with CEFR levels from item tags and descriptions, and maintain cursor pagination using ISO publication timestamps (`publishedAtCursor`) representing the newest listing's `publishedAt` timestamp.

When performing initial batch scans (`publishedAtCursor` is null/empty) and `criteria.limit` (Prefetch Batch Size) is specified, the adapter SHALL sequentially fetch search pages (`page=1`, `page=2`, etc.) accumulating parsed listings until the collected unique listings meet or exceed `criteria.limit` or no further pages exist (up to a configurable maximum safety limit of 5 pages).

When performing delta/update scans (`criteria.publishedAtCursor` is non-null), the adapter SHALL start from Page 1 and filter listings to those published strictly after `publishedAtCursor` and not present in `seenJobIds`. If the adapter encounters a listing with publication timestamp older than or equal to `publishedAtCursor` or an ID already present in `seenJobIds`, it SHALL immediately terminate pagination without fetching subsequent pages. If zero new postings are found, the adapter SHALL retain the existing `publishedAtCursor` and return an empty listing array.

The adapter SHALL support provider-specific endpoint selection via `providerHints.arbeitnow.endpoint` in `SearchCriteria`. When this hint is present, the adapter SHALL use that value as the URL path segment AND inject any tag implicitly associated with that endpoint into the `tags` query parameter alongside any candidate-derived tags. The endpoint-to-tag mapping is: `english-speaking-jobs` → `"english speaking"`, `visa-sponsorship-jobs` → `"visa sponsorship"`. Endpoints with no associated tag (`jobs-with-salary`, `4-day-work-week-jobs`, `jobs-with-relocation`) only change the path and do not inject any implicit tag. When the hint is absent or empty, the adapter SHALL fall back to the generic root endpoint without injecting implicit tags.

When querying total vacancies via `getJobCount` with search criteria, the adapter SHALL extract the total count by parsing the embedded JavaScript pagination state object (`let data = {...}`) from the search page HTML, reading `data.total` (or calculating `data.last_page * data.per_page` when `total` is missing). If embedded script parsing fails, the adapter MAY fall back to matching plain-text vacancy summary patterns in the DOM HTML or querying the public REST API envelope.

#### Scenario: Ingesting live offers from Arbeitnow web search
- **WHEN** an ingestion scan is executed for provider `arbeitnow` with search criteria containing keywords or tags (e.g. "javascript" with "english speaking")
- **THEN** the adapter issues an HTTP request to `https://www.arbeitnow.com/?search=javascript&tags=%5B%22english+speaking%22%5D&sort_by=newest&date_posted=all&page=1`, parses HTML search result cards into canonical `JobListing` items with provider `'arbeitnow'`, extracts the exact publication timestamp from `<time datetime="...">`, extracts spoken language requirements, and returns a `ProviderResult` with `fallback: false`

#### Scenario: Multi-page REST API pagination for batch sizes exceeding 35
- **WHEN** an ingestion scan is executed for provider `arbeitnow` using REST API fetching with `criteria.limit` set to 50
- **THEN** the adapter issues sequential REST API requests (`?page=1` and `?page=2`), accumulates items across both pages, normalizes and deduplicates them, truncates the result array to 50 listings, and returns a `ProviderResult` with `fallback: false`

#### Scenario: Using a provider-specific endpoint hint
- **WHEN** an ingestion scan is executed for provider `arbeitnow` with `providerHints.arbeitnow.endpoint` set to `english-speaking-jobs` and a keyword (e.g. `"javascript"`)
- **THEN** the adapter issues an HTTP request combining the endpoint path and its implicit tag: `https://www.arbeitnow.com/english-speaking-jobs?search=javascript&tags=%5B%22english+speaking%22%5D&sort_by=newest&...`, and returns a `ProviderResult` with `fallback: false`

#### Scenario: Date cursor filtering on Arbeitnow search results
- **WHEN** the adapter runs an update scan with a non-null `publishedAtCursor` timestamp and `seenJobIds`
- **THEN** the adapter starts scanning from Page 1, retains only listings published strictly after `publishedAtCursor` that are not in `seenJobIds`, stops fetching further pages immediately upon encountering any listing at or older than the cursor or in `seenJobIds`, and returns an updated cursor matching the newest item's timestamp (or keeps the existing cursor if no new items exist)

#### Scenario: Spoken language extraction from Arbeitnow search results
- **WHEN** an Arbeitnow job listing contains language tags or explicit language requirements in its HTML card or detail page (e.g. "German required", "fluent English")
- **THEN** the adapter parses these requirements into structured `spokenLanguages` entries with corresponding CEFR levels

#### Scenario: Graceful fallback when Arbeitnow web search is unreachable
- **WHEN** the Arbeitnow website request returns a non-200 status or times out
- **THEN** the adapter falls back to the public REST API or deterministic multi-page fallback generator without throwing an unhandled exception and sets `fallback: true`

#### Scenario: Querying total vacancies from Arbeitnow embedded script metadata
- **WHEN** the count query `getJobCount` is executed for provider `arbeitnow` with search criteria
- **THEN** the adapter parses the embedded script variable (`let data = {...}`) from the returned search HTML page and extracts `data.total` (or `data.last_page * data.per_page`) as the total matching vacancy count

### Requirement: Total Vacancy Count Querying Interface
The system SHALL extend the job provider interface to support fetching or estimating the total count of active job listings matching search criteria without requiring a full job extraction scan.

#### Scenario: Querying total vacancies from Bundesagentur für Arbeit
- **WHEN** the count query is executed for provider `arbeitsagentur` with search criteria
- **THEN** the adapter issues a lightweight query to `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs` and extracts `maxErgebnisse` from the response envelope to return the total available vacancy count

#### Scenario: Querying total vacancies from JustJoin.it
- **WHEN** the count query is executed for provider `justjoin` with search criteria
- **THEN** the adapter returns the total available matching job count (from Apify dataset metadata or fallback pool total size)


