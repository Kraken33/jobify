# Spec Delta

## ADDED Requirements

### Requirement: Total Vacancy Count Querying Interface
The system SHALL extend the job provider interface to support fetching or estimating the total count of active job listings matching search criteria without requiring a full job extraction scan.

#### Scenario: Querying total vacancies from Bundesagentur für Arbeit
- **WHEN** the count query is executed for provider `arbeitsagentur` with search criteria
- **THEN** the adapter issues a lightweight query to `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs` and extracts `maxErgebnisse` from the response envelope to return the total available vacancy count

#### Scenario: Querying total vacancies from JustJoin.it
- **WHEN** the count query is executed for provider `justjoin` with search criteria
- **THEN** the adapter returns the total available matching job count (from Apify dataset metadata or fallback pool total size)
