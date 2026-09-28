# Spec Delta

## MODIFIED Requirements

### Requirement: Pre-filtering Against Hard Constraints
The system SHALL filter out candidate listings that violate non-negotiable user constraints (such as remote work requirement or incompatible seniority bounds) before invoking the LLM. It SHALL additionally skip any listing whose provider job ID is present in the active session's `seenJobIds` set, preventing duplicate AI evaluations and associated token costs.

#### Scenario: Listing rejected by hard constraint
- **WHEN** a candidate profile specifies strictly remote work and a fetched listing is strictly on-site in an unrelated city
- **THEN** the system excludes the listing from LLM scoring to conserve API tokens and processing time

#### Scenario: Already-seen listing skipped
- **WHEN** a fetched listing's provider job ID matches an entry in the active session's `seenJobIds` set
- **THEN** the system skips that listing entirely — it is neither pre-filtered nor sent to the LLM — and the seen-IDs set is not modified for that listing

### Requirement: OpenAI Structured Fit Evaluation
The system SHALL submit eligible job descriptions along with the candidate's profile to the OpenAI API using the user's provided API key, receiving a structured evaluation containing an overall fit score (0-100), key matching pros, critical missing skill gaps, and a concise summary.

#### Scenario: Successful fit evaluation
- **WHEN** the matching engine sends the candidate profile and normalized job details to OpenAI
- **THEN** OpenAI returns a valid structured JSON object with `score` (0 to 100), `pros` list, `gaps` list, and `summary` text

#### Scenario: Invalid or expired API key
- **WHEN** a match request is sent with an invalid or quota-exceeded OpenAI API key
- **THEN** the system catches the authentication/quota error and prompts the user to verify their API key in settings

### Requirement: Ranked Matches Display with External Application Links
The system SHALL present scored matches in descending order of fit score, highlighting the match percentage, key pros, potential skill gaps, and a direct external link to the job posting.

#### Scenario: Viewing ranked matches
- **WHEN** an evaluation batch finishes
- **THEN** the user interface displays the job cards ordered from highest fit score to lowest, each containing a direct link opening the posting on JustJoin.it in a new tab

## ADDED Requirements

### Requirement: Session-Scoped Scan Execution
The system SHALL accept a `sessionId` on the scan endpoint to identify the active search session. It SHALL load the session's checkpoint (provider fingerprint, `publishedAtCursor`, `seenJobIds`), pass the cursor to the provider adapter, and persist the updated checkpoint and seen-ID set after each successful scan.

#### Scenario: Scan with existing session checkpoint
- **WHEN** the user triggers a scan for an active session that has a stored `publishedAtCursor`
- **THEN** the system passes that cursor to the provider, receives only listings newer than the cursor, updates `seenJobIds` with the newly scored job IDs, and persists the new `publishedAtCursor` from the provider's `nextCursor`

#### Scenario: Scan with no prior checkpoint (first scan or cursor reset)
- **WHEN** the user triggers a scan for a session with no stored cursor
- **THEN** the system fetches the full current pool without a date filter and stores the returned `nextCursor` as the session's new `publishedAtCursor`

### Requirement: Provider Fingerprint Invalidation on Search-Parameter Change
The system SHALL compute a provider fingerprint from the session's provider-query parameters (skills, seniority, workMode, location). When the session's search parameters change in a way that alters the fingerprint, the system SHALL reset the `publishedAtCursor` to null and clear the `seenJobIds` for that session, triggering a fresh full-pool scan on the next request. Changes to LLM-only profile fields (experienceSummary, targetRole, minSalary) SHALL NOT invalidate the cursor.

#### Scenario: Cursor reset when provider params change
- **WHEN** a session's skills, seniority, workMode, or location are updated, producing a different fingerprint
- **THEN** the stored `publishedAtCursor` and `seenJobIds` for that session are cleared, and the next scan fetches the full pool for the new parameters

#### Scenario: Cursor preserved when only LLM params change
- **WHEN** the candidate profile's `experienceSummary`, `targetRole`, or `minSalary` are updated without changing the session's provider-query parameters
- **THEN** the session's `publishedAtCursor` and `seenJobIds` remain unchanged, and the next scan continues from where it left off

### Requirement: Checkpoint Persistence with localStorage Fallback
The system SHALL persist scan checkpoints (fingerprint, cursor, seenJobIds, lastScanAt) to Supabase when configured, and fall back to browser `localStorage` when Supabase is not available, ensuring the pagination state survives page reloads in both guest and authenticated modes.

#### Scenario: Checkpoint saved to Supabase
- **WHEN** a scan completes and Supabase is configured
- **THEN** the system upserts the updated checkpoint into the `scan_checkpoints` table keyed by (profile_id, provider_id) and reflects the new `lastScanAt`

#### Scenario: Checkpoint saved to localStorage in guest mode
- **WHEN** a scan completes and Supabase is not configured
- **THEN** the system serialises the checkpoint to `localStorage` under a key scoped to the session ID, so the cursor persists across page reloads without requiring a database
