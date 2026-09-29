# Spec Delta

## MODIFIED Requirements

### Requirement: Session-Scoped Scan Execution
The system SHALL accept an optional `session` object or `sessionId` on the scan endpoint to identify and configure the active search session, along with an optional client-provided Apify API token via request header or payload. When `session` is provided in the request body, the system SHALL prioritize its parameters (including `targetRole`, `providerOptions`, `skills`, `seniority`, `workMode`, `location`, `spokenLanguages`) over default profile settings and database lookups. It SHALL load the session's checkpoint (provider fingerprint, `publishedAtCursor`, `seenJobIds`), pass the cursor and Apify token to the provider adapter, and persist the updated checkpoint and seen-ID set after each successful scan.

#### Scenario: Scan with client-provided session payload
- **WHEN** the client triggers a scan and provides the full `session` object in the request body
- **THEN** the system applies the session's designated `targetRole`, `providerOptions`, `skills`, and filters directly to the provider search criteria without falling back to profile defaults, regardless of whether a database session record exists

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
