# Search Sessions Specification

## Purpose
Provides named, persistent job-hunt tracks that pair a set of provider-level search parameters (skills, seniority, work mode, location) with a pagination cursor and a seen-job deduplication set, enabling users to run multiple independent, stateful job searches simultaneously without mixing their result pools or replay positions.

## Requirements

### Requirement: Search Session Entity
The system SHALL allow users to create and maintain one or more named search sessions, each holding its own provider selection (`justjoin`, `arbeitsagentur`, or `arbeitnow`), target role (`targetRole`), provider search parameters (skills, seniority, work mode, location, spoken languages with target CEFR levels), and provider-specific options (`providerOptions` such as Arbeitnow endpoint mode) independently of the candidate identity profile. The system SHALL persist all search sessions in the Supabase `search_sessions` table with full schema support for `target_role`, `spoken_languages`, and `provider_options`. When initiating scans or vacancy counts, the client SHALL forward the complete active session object along with any active `seenJobIds` and pagination cursors for that session to server endpoints.

#### Scenario: Creating a new search session
- **WHEN** a user creates a new search session with a name, designated provider (`justjoin`, `arbeitsagentur`, or `arbeitnow`), target role, provider-specific options, and a set of provider search parameters (skills, seniority, work mode, optional location, optional spoken languages)
- **THEN** the system persists the session into Supabase with a unique ID, custom target role, spoken languages, and provider options, ready for its first scan

#### Scenario: Creating a new search session with profile inheritance
- **WHEN** a user opens the session creation modal and chooses to inherit from profile
- **THEN** the system pre-populates the session form with the candidate profile's current target role, skills, seniority, work mode, preferred location, and spoken languages with CEFR levels for customization

#### Scenario: Creating a new search session from scratch
- **WHEN** a user opens the session creation modal and chooses to create from scratch
- **THEN** the system displays empty parameter inputs allowing the user to configure a new track completely independent of profile defaults

#### Scenario: Deleting a search session
- **WHEN** a user deletes an active or inactive custom search session
- **THEN** the system removes the session record from Supabase, its associated scan checkpoint, and its persisted match results, switching the active session to a remaining session

#### Scenario: Multiple concurrent sessions
- **WHEN** a user has two or more active search sessions with different search parameters (e.g. "Full Stack" with React/Node skills on JustJoin.it and "German Backend" with German B2 requirement on Arbeitsagentur)
- **THEN** each session independently maintains its own pagination cursor and seen-job set in Supabase, and scans from one session route to its own provider without affecting the cursor or match list of another

### Requirement: Session Selection in the UI
The system SHALL provide a UI control for switching between active search sessions on the matches board, displaying each session's name, provider, and last scanned timestamp, and offering direct actions to add a new session or delete the active custom session.

#### Scenario: Switching between sessions
- **WHEN** the user selects a different session from the session switcher
- **THEN** the matches board displays only the matches associated with the selected session and the scan controls reflect that session's cursor state

#### Scenario: Triggering session creation modal
- **WHEN** the user clicks the "+ New Track" button in the matches board
- **THEN** the session creation dialog opens with options to inherit profile parameters or fill from scratch

### Requirement: Session-Scoped Matches
The system SHALL associate each job match result with the search session that produced it in the Supabase `job_matches` table, so that matches from different sessions are stored, queried, and displayed independently across context switches. The system SHALL enforce uniqueness per session and provider job ID, and SHALL deduplicate records when loading session matches so that identical listings are never displayed multiple times. The system SHALL persist the vacancy's original publication timestamp (`published_at`) to `job_matches` and rehydrate it on reload so that card publication dates and day-based sorting accurately reflect when the job was posted rather than the scan insertion date.

#### Scenario: Matches isolated per session
- **WHEN** a scan completes for session A
- **THEN** the resulting match cards appear only under session A, are persisted with `session_id` pointing to session A in Supabase, and are not visible when session B is the active session

#### Scenario: Context switching preserves session matches
- **WHEN** the user switches from session A to session B and then back to session A
- **THEN** the matches board restores the exact matches and evaluation results previously scored for session A from Supabase without requiring a re-scan

#### Scenario: Deduplicated match loading across page reloads
- **WHEN** a user reloads the application for an active search session
- **THEN** the system loads matches for that session deduplicated by `provider_job_id` and does not display inflated or duplicated match counts

#### Scenario: Preserving publication timestamps across page reloads
- **WHEN** a user reloads the application or navigates across sessions with existing saved matches
- **THEN** each loaded vacancy retains its original `publishedAt` date value, card date labels render the actual relative or formatted calendar date instead of defaulting to "Today", and "Newest" sort orders vacancies by their original publication day

### Requirement: Profile as Default Session Template
The system SHALL use the candidate profile's target role, skills, seniority, work mode, and spoken language fields as default values when bootstrapping a new search session in Supabase, while the session's own parameters are the authoritative source for all provider queries once the session is created.

#### Scenario: Bootstrapping a first session from profile defaults
- **WHEN** no sessions exist for the current profile in Supabase and the user loads the app or triggers a scan
- **THEN** the system automatically creates an implicit session using the profile's current target role, skills, seniority, work mode, and spoken languages, persists it in Supabase, and associates subsequent matches with that session


### Requirement: Total Vacancies and Prefetch Batch Sizing Control
The system SHALL surface the total number of matching vacancies available for the current search session, forwarding the active search session payload with its target role and provider options to the vacancy count endpoint, and allow the user to select or configure a custom batch size for scan execution directly next to the session reset controls. The system SHALL display the primary scan trigger button as `"Scan Batch ({batchSize})"` when a search session is uninitialized or has no stored matches/checkpoint, and SHALL transition the primary scan button to `"Update"` once an initial scan batch has completed and a session checkpoint or matches exist. Clicking `"Update"` SHALL execute a delta scan searching for all newly published vacancies published strictly after the session's last checkpoint timestamp. Resetting a search session SHALL clear its checkpoint and revert the primary scan button back to `"Scan Batch ({batchSize})"`.

#### Scenario: Total vacancy count displayed in session controls
- **WHEN** a user views an active search session on the matches board
- **THEN** the client sends the active session object to the count endpoint, and the session header displays a dropdown button showing the total matching vacancy count for that session's criteria and the current prefetch batch size

#### Scenario: Selecting a preset prefetch batch size for initial prefetch
- **WHEN** a user opens the total vacancies dropdown and selects a preset batch amount (e.g., 5, 10, 20, 50) on an uninitialized session
- **THEN** the prefetch batch size for the session is updated, and the primary scan trigger button text updates to reflect the chosen batch count (e.g., "Scan Batch (20)")

#### Scenario: Setting a custom prefetch batch size
- **WHEN** a user selects "Set Custom Batch Amount..." as the last item in the total vacancies dropdown
- **THEN** the system prompts the user for a custom numeric batch limit, updates the active session batch size, and uses that limit for initial prefetch batch scan requests

#### Scenario: Primary scan button transitions to Update after initial scan
- **WHEN** an initial batch scan completes for a search session and creates matches or an active checkpoint with a `publishedAtCursor`
- **THEN** the primary scan trigger button text transitions from "Scan Batch ({batchSize})" to "Update"

#### Scenario: Triggering an Update scan for newly published vacancies
- **WHEN** a user clicks the "Update" button on an active session with existing matches
- **THEN** the system issues a match request passing the session's `publishedAtCursor` timestamp to retrieve all vacancies published strictly after that cursor, appending any new unique matches to the board and updating the session checkpoint

#### Scenario: Resetting session reverts button to Scan Batch
- **WHEN** a user resets an active search session
- **THEN** the system clears the session's matches and checkpoint, reverting the primary scan button back to "Scan Batch ({batchSize})"
