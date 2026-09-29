# Job Matching Engine Specification Delta

## MODIFIED Requirements

### Requirement: Session-Scoped Scan Execution
The system SHALL accept an optional `session` object or `sessionId` on the scan endpoint to identify and configure the active search session, along with optional client-provided `seenJobIds` and pagination cursor in the POST payload body, and an optional client-provided Apify API token via request header or payload. When `session` is provided in the request body, the system SHALL prioritize its parameters (including `targetRole`, `providerOptions`, `skills`, `seniority`, `workMode`, `location`, `spokenLanguages`) over default profile settings and database lookups. It SHALL load the session's checkpoint (provider fingerprint, `publishedAtCursor`, `seenJobIds`), merging payload-provided `seenJobIds` and cursor values when database checkpoints are absent, pass the cursor and Apify token to the provider adapter, and persist the updated checkpoint, seen-ID set, and newly scored match records idempotently after each successful scan.

#### Scenario: Scan with client-provided session payload
- **WHEN** the client triggers a scan and provides the full `session` object in the request body
- **THEN** the system applies the session's designated `targetRole`, `providerOptions`, `skills`, and filters directly to the provider search criteria without falling back to profile defaults, regardless of whether a database session record exists

#### Scenario: Scan with client-provided seenJobIds payload fallback
- **WHEN** a scan request is executed without a database checkpoint but includes client-provided `seenJobIds` in the payload body
- **THEN** the system uses the payload's `seenJobIds` list to filter out already-seen vacancies before scoring, preventing duplicate AI evaluations

#### Scenario: Scan with existing session checkpoint
- **WHEN** the user triggers a scan for an active session that has a stored `publishedAtCursor`
- **THEN** the system passes that cursor to the provider, receives only listings newer than the cursor, updates `seenJobIds` with the newly scored job IDs, and persists the new `publishedAtCursor` from the provider's `nextCursor`

#### Scenario: Scan with no prior checkpoint (first scan or cursor reset)
- **WHEN** the user triggers a scan for a session with no stored cursor
- **THEN** the system fetches the full current pool without a date filter and stores the returned `nextCursor` as the session's new `publishedAtCursor`

#### Scenario: Scan with existing session checkpoint and Apify token
- **WHEN** the user triggers a scan for an active session with an Apify API token in the request header
- **THEN** the system passes that token and stored cursor to the provider, receives listings newer than the cursor, updates `seenJobIds` with the newly scored job IDs, and persists the updated `publishedAtCursor`

#### Scenario: Scan without Apify token
- **WHEN** the user triggers a scan without providing an Apify API token
- **THEN** the system forwards the request to the provider with null token, receiving deterministic fallback listings, and proceeds with pre-filtering and AI matching without failing

#### Scenario: Consecutive batch scans advance provider pagination
- **WHEN** a user triggers multiple consecutive scans on a provider track with remaining vacancies
- **THEN** each scan advances the pagination state (page number and/or cursor), processes unseen listings without stalling, and appends the new matches to the session results

## ADDED Requirements

### Requirement: Accurate Newly Evaluated Scan Toast Messaging
The system SHALL evaluate the count of newly appended unique match results (`newUnique`) in the user interface after a scan completes. When `newUnique.length > 0`, the client SHALL display a success toast stating `"Successfully evaluated X new positions!"` (or including server notices). When `newUnique.length === 0` (even if the backend returned previously scored duplicate matches), the client SHALL NOT display a false success message and SHALL instead display `"There are no new vacancies added"` or the backend notice/message.

#### Scenario: Toast message when new vacancies are added
- **WHEN** a batch scan returns 5 new match results that are not already present in the active session's match list (`newUnique.length === 5`)
- **THEN** the user interface displays a success notification stating `"Successfully evaluated 5 new positions!"`

#### Scenario: Toast message when no new vacancies are added
- **WHEN** a batch scan completes and returns 0 new match results that were not already present in the active session's match list (`newUnique.length === 0`)
- **THEN** the user interface displays an info/warning toast stating `"There are no new vacancies added"` instead of claiming positions were evaluated
