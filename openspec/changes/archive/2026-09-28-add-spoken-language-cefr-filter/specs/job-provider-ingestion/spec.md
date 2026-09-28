# Spec Delta

## MODIFIED Requirements

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
