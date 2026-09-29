# Job Matching Engine Specification

## Purpose
Evaluates candidate profiles against fetched job listings using rule-based pre-filtering and OpenAI structured analysis to present ranked opportunities with application links.

## Requirements

### Requirement: Pre-filtering Against Hard Constraints
The system SHALL evaluate all fetched job listings against user profile constraints (remote work, seniority bounds, salary, and spoken languages). Non-matching listings SHALL NOT be discarded or hidden; instead, the system SHALL convert hard constraint failures into low-match evaluations with a fit score of 25%, verdict `Low Match`, and explicit gap explanations, completely bypassing LLM evaluation to conserve API quota while ensuring every fetched vacancy remains visible to the user. Listings whose provider job ID is present in the active session's `seenJobIds` set SHALL continue to be skipped to prevent re-evaluating already processed jobs.

#### Scenario: Listing with hard constraint mismatch included as low match without LLM evaluation
- **WHEN** a candidate profile specifies strictly remote work and a fetched listing is strictly on-site in an unrelated city
- **THEN** the system assigns the listing a low-match evaluation (score 25%, verdict `Low Match`, gap describing the work mode mismatch), skips sending the listing to OpenAI, and includes it at the bottom of the scan results

#### Scenario: Listing rejected due to spoken language level gap included as low match
- **WHEN** a job listing requires spoken languages (e.g. English B2 and Polish C2) and the candidate profile lacks one or more required languages or specifies a lower CEFR level (e.g. candidate has English B2 but no Polish)
- **THEN** the system evaluates the candidate against all required languages and assigns a low-match evaluation (score 25%, verdict `Low Match`, gap listing missing required language `Polish`) included in the scan results without invoking OpenAI

#### Scenario: Already-seen listing skipped
- **WHEN** a fetched listing's provider job ID matches an entry in the active session's `seenJobIds` set
- **THEN** the system skips that listing entirely — it is neither evaluated nor included in the results — and the seen-IDs set is not modified for that listing

### Requirement: OpenAI Structured Fit Evaluation
The system SHALL submit eligible job descriptions along with the candidate's profile (including target role, seniority, skills, work mode, and spoken languages with CEFR levels) to the OpenAI API using the user's provided API key, evaluating all eligible listings up to the requested batch limit (`limit` or `maxScanLimit`) without imposing an arbitrary static evaluation cap, receiving a structured evaluation containing an overall fit score (0-100), key matching pros, critical missing skill gaps, and a concise summary.

In addition, when the job listing's `spokenLanguages` field is absent or empty but a non-empty description is present, the system SHALL instruct the LLM to inspect the job description text and determine whether it explicitly requires spoken languages that the candidate's profile does not cover. If the LLM detects such an unsatisfied language requirement, it SHALL include it as a gap in the structured evaluation and reflect an appropriately reduced fit score.

#### Scenario: Successful fit evaluation
- **WHEN** the matching engine sends the candidate profile and normalized job details to OpenAI
- **THEN** OpenAI returns a valid structured JSON object with `score` (0 to 100), `pros` list, `gaps` list, and `summary` text

#### Scenario: Evaluating full requested batch size
- **WHEN** 20 unseen job listings pass hard constraints and the scan request specifies a batch limit of 20
- **THEN** the system evaluates all 20 eligible listings with OpenAI in parallel batches and returns all 20 scored match results

#### Scenario: Invalid or expired API key
- **WHEN** a match request is sent with an invalid or quota-exceeded OpenAI API key
- **THEN** the system catches the authentication/quota error and prompts the user to verify their API key in settings

#### Scenario: LLM detects language requirement in description when spokenLanguages field is missing
- **WHEN** a job listing has no `spokenLanguages` entries but the description contains explicit language requirements (e.g., "Fluent Polish required" or "Komunikacja w języku polskim") and the candidate's profile does not include that language
- **THEN** the AI matcher includes the missing language as a gap in the evaluation result and assigns a lower fit score reflecting the mismatch

#### Scenario: LLM finds no hidden language requirements
- **WHEN** a job listing has no `spokenLanguages` entries and the description does not contain explicit language requirements
- **THEN** the AI matcher proceeds with normal evaluation without penalizing the candidate for language gaps

### Requirement: Ranked Matches Display with External Application Links
The system SHALL present all evaluated job matches in descending order of fit score. Fully eligible jobs scored by the AI matcher SHALL appear at the top, while non-matching listings with low-match evaluations (score 25%) SHALL appear at the very bottom, highlighting match percentage, key pros, constraint gap reasons, and direct external application links.

#### Scenario: Viewing ranked matches with low-match vacancies at the bottom
- **WHEN** an evaluation scan finishes containing both eligible and constraint-failing job listings
- **THEN** the user interface displays all parsed job cards ordered from highest fit score to lowest, with high/medium AI matches displayed first and hard constraint mismatches rendered at the very bottom of the feed

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

### Requirement: Accurate Newly Evaluated Scan Toast Messaging
The system SHALL evaluate the count of newly appended unique match results (`newUnique`) in the user interface after a scan completes. When `newUnique.length > 0`, the client SHALL display a success toast stating `"Successfully evaluated X new positions!"` (or including server notices). When `newUnique.length === 0` (even if the backend returned previously scored duplicate matches), the client SHALL NOT display a false success message and SHALL instead display `"There are no new vacancies added"` or the backend notice/message.

#### Scenario: Toast message when new vacancies are added
- **WHEN** a batch scan returns 5 new match results that are not already present in the active session's match list (`newUnique.length === 5`)
- **THEN** the user interface displays a success notification stating `"Successfully evaluated 5 new positions!"`

#### Scenario: Toast message when no new vacancies are added
- **WHEN** a batch scan completes and returns 0 new match results that were not already present in the active session's match list (`newUnique.length === 0`)
- **THEN** the user interface displays an info/warning toast stating `"There are no new vacancies added"` instead of claiming positions were evaluated

### Requirement: Provider Fingerprint Invalidation on Search-Parameter Change
The system SHALL compute a provider fingerprint from the session's provider-query parameters (skills, seniority, workMode, location, and spoken languages). When the session's search parameters change in a way that alters the fingerprint, the system SHALL reset the `publishedAtCursor` to null and clear the `seenJobIds` for that session, triggering a fresh full-pool scan on the next request. Changes to LLM-only profile fields (experienceSummary, targetRole, minSalary) SHALL NOT invalidate the cursor.

#### Scenario: Cursor reset when provider params change
- **WHEN** a session's skills, seniority, workMode, location, or spoken language filters are updated, producing a different fingerprint
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

### Requirement: Client-Provided Apify API Token Configuration
The system SHALL allow users to locally store, view masked, update, and clear an Apify API token in the client Profile settings section alongside their OpenAI API key. The Apify token SHALL never be persisted in any application database.

#### Scenario: Saving and viewing an Apify API token
- **WHEN** the user inputs an Apify token in the Profile settings section and confirms
- **THEN** the token is stored in browser local storage and subsequent scans include the token in the `X-Apify-Token` header

#### Scenario: Clearing an Apify API token
- **WHEN** the user removes their stored Apify token from Profile settings
- **THEN** local storage is cleared of the token and subsequent scan requests omit the `X-Apify-Token` header

### Requirement: Programmatic Key Modal Prompt
The system SHALL display a minimal programmatic prompt modal when a scan attempt is triggered without an OpenAI API key saved in browser storage.

#### Scenario: Scan initiated without OpenAI API key
- **WHEN** the user clicks "Scan & Evaluate Jobs" while no OpenAI API key is saved
- **THEN** the system opens a focused prompt modal requiring an OpenAI key to proceed, without disrupting existing tab state
