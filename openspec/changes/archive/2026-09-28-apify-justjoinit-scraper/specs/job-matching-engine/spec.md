# Spec Delta: Job Matching Engine

## MODIFIED Requirements

### Requirement: Session-Scoped Scan Execution
The system SHALL accept a `sessionId` on the scan endpoint to identify the active search session and an optional client-provided Apify API token via request header or payload. It SHALL load the session's checkpoint (provider fingerprint, `publishedAtCursor`, `seenJobIds`), pass the cursor and Apify token to the provider adapter, and persist the updated checkpoint and seen-ID set after each successful scan.

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

## ADDED Requirements

### Requirement: Client-Provided Apify API Token Configuration
The system SHALL allow users to locally store, view masked, update, and clear an Apify API token in the client browser settings interface alongside their OpenAI API key. The Apify token SHALL never be persisted in any application database.

#### Scenario: Saving and viewing an Apify API token
- **WHEN** the user inputs an Apify token in the settings modal and confirms
- **THEN** the token is stored in browser local storage and subsequent scans include the token in the `X-Apify-Token` header

#### Scenario: Clearing an Apify API token
- **WHEN** the user removes their stored Apify token from settings
- **THEN** local storage is cleared of the token and subsequent scan requests omit the `X-Apify-Token` header
