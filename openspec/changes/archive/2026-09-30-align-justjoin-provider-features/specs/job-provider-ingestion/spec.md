# Spec Delta

## MODIFIED Requirements

### Requirement: JustJoin.it Provider Integration
The system SHALL implement a provider adapter for JustJoin.it that fetches live job offers. When an Apify API token is available in search criteria or runtime configuration, the adapter SHALL query JustJoin.it offers through the Apify `trev0n/justjoinit-scraper` actor. The adapter SHALL construct a canonical JustJoin.it search URL via `buildSearchUrl` (combining location slug, technology category, role keyword, seniority level, and workplace mode) and provide it via the `startUrls` parameter in the actor input payload along with `limit` (matching requested `criteria.limit`), string `experience`, and role keyword. The adapter SHALL log HTTP requests transparently including the target JustJoin search URL query string in logged request metadata so parameters are inspectable in the HTTP logger.

The adapter SHALL parse returned dataset items into canonical job listing objects, extract required spoken languages (`spokenLanguages`) with CEFR levels from item fields, all tech stack skill arrays (`requiredSkills`, `skills`, `niceToHave`, `techStack`, `tech_stack`, `skills_tags`), or offer descriptions, and preserve cursor pagination. When performing delta update scans (`criteria.publishedAtCursor` is non-null), the adapter SHALL sort parsed listings newest-first, filter to listings published strictly after `publishedAtCursor` and not present in `seenJobIds`. If zero new postings are found, the adapter SHALL retain the existing `publishedAtCursor` and return an empty listing array.

When no Apify token is provided or when scraping requests fail or exceed quotas, the adapter SHALL fall back to a deterministic multi-page fallback generator without crashing, returning up to `criteria.limit` listings seeded by page offset and setting `fallback: true`.

The adapter SHALL apply spoken-language pre-filtering during Apify input construction: when the candidate's search criteria include `spokenLanguages`, and the actor supports a language filter parameter (e.g., `languages`), the adapter SHALL include only the candidate's known language codes in the actor input to reduce language-mismatched listings at the source. If the actor does not support such a filter or the parameter has no effect, this requirement does not apply and language filtering falls back to client-side pre-filtering only.

The adapter's `extractSpokenLanguages` function SHALL correctly identify language requirements from JustJoin offer data across all tech stack arrays (`requiredSkills`, `skills`, `niceToHave`, `techStack`, `tech_stack`, `skills_tags`) and vacancy descriptions. It SHALL inspect both string skill tags and object properties (`name`, `level`, `value`, `title`) to catch languages in tech stack items (e.g. `Polish (B2)`, `{ name: 'Język polski', level: 'C1' }`). It SHALL NOT treat two-letter technical skill abbreviations (e.g., `pl` as a skill tag for programming language or framework) as Polish language requirements unless whole-token matching confirms spoken language intent. It SHALL detect explicit language requirements in description text (e.g., "fluent English", "Polish required", "komunikatywność po angielsku") and map them to structured `SpokenLanguage` entries with appropriate CEFR levels.

#### Scenario: Canonical search URL and actor input construction
- **WHEN** search criteria contain an Apify token, target role "Frontend Developer", seniority "senior", work mode "remote", and location "Warsaw"
- **THEN** the adapter constructs the canonical URL `https://justjoin.it/warszawa/all?keyword=Frontend+Developer&experience-level=senior&workplace-type=remote` and submits it in `startUrls` with `limit`, `keyword`, and `experience` in the Apify actor request payload

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
- **WHEN** the JustJoin.it endpoint returns a non-200 status or times out and `criteria.limit` is specified
- **THEN** the fallback generator produces up to `criteria.limit` distinct mock listings for the current page seeded by page offset, so that successive calls without a live API still yield non-overlapping results

#### Scenario: Handling provider downtime or network error
- **WHEN** the JustJoin.it endpoint returns a non-200 status or times out
- **THEN** the adapter falls back to the deterministic multi-page generator without crashing the application and includes a `fallback: true` flag in the `ProviderResult`

#### Scenario: Ingesting live offers via Apify actor with spoken language extraction
- **WHEN** search criteria contain an Apify API token and target a specific role and seniority (e.g., "mid")
- **THEN** the adapter executes the `trev0n/justjoinit-scraper` actor with corresponding keyword and experience filters, transforms returned dataset items into normalized listings with extracted `spokenLanguages`, and returns a `ProviderResult` with `fallback: false`

#### Scenario: Date cursor filtering with Apify scraper
- **WHEN** the adapter runs with an Apify token and a non-null `publishedAtCursor`
- **THEN** the adapter sorts results by publication date and filters listings to those published strictly after the cursor timestamp, returning an updated cursor matching the newest listing or preserving the incoming `publishedAtCursor` if zero new listings match

#### Scenario: Apify token missing or unconfigured
- **WHEN** ingestion is triggered without an Apify API token
- **THEN** the adapter gracefully invokes the deterministic multi-page fallback generator seeded by page offset, returns mock listings, and sets `fallback: true`

#### Scenario: Handling Apify scraper errors or rate limits
- **WHEN** the Apify run fails due to invalid token, insufficient compute credits (402/403), or timeout
- **THEN** the adapter catches the error, logs a diagnostic warning, falls back to the deterministic multi-page generator, and returns a `ProviderResult` with `fallback: true`
