# Spec Delta: job-provider-ingestion

## ADDED Requirements

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
