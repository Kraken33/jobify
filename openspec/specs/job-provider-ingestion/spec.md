# Job Provider Ingestion Specification

## Purpose
Defines an extensible job provider ingestion interface and a JustJoin.it adapter to fetch, parse, and normalize job listings.

## Requirements

### Requirement: Extensible Job Provider Adapter Interface
The system SHALL define a standardized provider contract that accepts candidate search criteria (such as technology keywords, seniority level, and remote preferences) and returns normalized job listings containing title, company, salary ranges, location, required skills, and direct external application URLs.

#### Scenario: Provider interface returns normalized listing structure
- **WHEN** a provider adapter fetches listings from its underlying source
- **THEN** it transforms each listing into the unified schema with title, company, description/details, skills tags, workplace type, and canonical external URL

### Requirement: JustJoin.it Provider Integration
The system SHALL implement a provider adapter for JustJoin.it that queries its public endpoints based on user tech stack tags, seniority levels, and remote work preferences.

#### Scenario: Fetching listings by technology and level
- **WHEN** the user initiates an ingestion run targeting specific skills (e.g., "javascript", "react") and seniority (e.g., "mid")
- **THEN** the JustJoin.it adapter queries the appropriate JustJoin.it endpoints, retrieves the newest active postings, and returns normalized job objects

#### Scenario: Handling provider downtime or network error
- **WHEN** the JustJoin.it endpoint returns a non-200 status or times out
- **THEN** the adapter surfaces a descriptive error message without crashing the application
