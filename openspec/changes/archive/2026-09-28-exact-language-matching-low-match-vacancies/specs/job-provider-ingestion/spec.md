# Spec Delta

## MODIFIED Requirements

### Requirement: JustJoin.it Provider Integration
The system SHALL implement a provider adapter for JustJoin.it that fetches live job offers. When an Apify API token is available in search criteria or runtime configuration, the adapter SHALL query JustJoin.it offers through the Apify `trev0n/justjoinit-scraper` actor. The adapter SHALL map candidate skills, seniority, work mode, and location to actor input parameters, parse returned dataset items into canonical job listing objects, extract required spoken languages (`spokenLanguages`) with CEFR levels from item fields, skill tags, or offer descriptions, and preserve cursor pagination. When no Apify token is provided or when scraping requests fail or exceed quotas, the adapter SHALL fall back to a deterministic multi-page fallback generator without crashing.

#### Scenario: Ingesting live offers via Apify actor with spoken language extraction
- **WHEN** search criteria contain an Apify API token and target specific skills (e.g., "javascript", "react") and seniority (e.g., "mid")
- **THEN** the adapter executes the `trev0n/justjoinit-scraper` actor with corresponding category, keyword, and experience filters, transforms returned dataset items into normalized listings with extracted `spokenLanguages`, and returns a `ProviderResult` with `fallback: false`

#### Scenario: Spoken language tags extracted from JustJoin offer data
- **WHEN** a JustJoin offer specifies language requirements in skills, raw fields, or offer body (e.g., "English B2", "Polish C2")
- **THEN** the adapter parses these requirements into structured `spokenLanguages` entries on the normalized `JobListing` object
