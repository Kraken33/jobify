# Search Sessions Specification

## Purpose
Provides named, persistent job-hunt tracks that pair a set of provider-level search parameters (skills, seniority, work mode, location) with a pagination cursor and a seen-job deduplication set, enabling users to run multiple independent, stateful job searches simultaneously without mixing their result pools or replay positions.

## Requirements

### Requirement: Search Session Entity
The system SHALL allow users to create and maintain one or more named search sessions, each holding its own provider selection (`justjoin` or `arbeitsagentur`) and provider search parameters independently of the candidate identity profile.

#### Scenario: Creating a new search session
- **WHEN** a user creates a new search session with a name, designated provider (`justjoin` or `arbeitsagentur`), and a set of provider search parameters (skills, seniority, work mode, optional location)
- **THEN** the system persists the session with a unique ID and an empty cursor state, ready for its first scan

#### Scenario: Creating a new search session with profile inheritance
- **WHEN** a user opens the session creation modal and chooses to inherit from profile
- **THEN** the system pre-populates the session form with the candidate profile's current target role, skills, seniority, work mode, and preferred location for customization

#### Scenario: Creating a new search session from scratch
- **WHEN** a user opens the session creation modal and chooses to create from scratch
- **THEN** the system displays empty parameter inputs allowing the user to configure a new track completely independent of profile defaults

#### Scenario: Deleting a search session
- **WHEN** a user deletes an active or inactive custom search session
- **THEN** the system removes the session record, its associated scan checkpoint, and its persisted match results, switching the active session to a remaining session

#### Scenario: Multiple concurrent sessions
- **WHEN** a user has two or more active search sessions with different search parameters (e.g. "Full Stack" with React/Node skills on JustJoin.it and "German Backend" on Arbeitsagentur)
- **THEN** each session independently maintains its own pagination cursor and seen-job set, and scans from one session route to its own provider without affecting the cursor or match list of another

### Requirement: Session Selection in the UI
The system SHALL provide a UI control for switching between active search sessions on the matches board, displaying each session's name, provider, and last scanned timestamp, and offering direct actions to add a new session or delete the active custom session.

#### Scenario: Switching between sessions
- **WHEN** the user selects a different session from the session switcher
- **THEN** the matches board displays only the matches associated with the selected session and the scan controls reflect that session's cursor state

#### Scenario: Triggering session creation modal
- **WHEN** the user clicks the "+ New Track" button in the matches board
- **THEN** the session creation dialog opens with options to inherit profile parameters or fill from scratch

### Requirement: Session-Scoped Matches
The system SHALL associate each job match result with the search session that produced it, so that matches from different sessions are stored, cached, and displayed independently across context switches.

#### Scenario: Matches isolated per session
- **WHEN** a scan completes for session A
- **THEN** the resulting match cards appear only under session A, are persisted under session A's storage key, and are not visible when session B is the active session

#### Scenario: Context switching preserves session matches
- **WHEN** the user switches from session A to session B and then back to session A
- **THEN** the matches board restores the exact matches and evaluation results previously scored for session A without requiring a re-scan

### Requirement: Profile as Default Session Template
The system SHALL use the candidate profile's skills, seniority, and work mode fields as default values when bootstrapping a new search session, while the session's own parameters are the authoritative source for all provider queries once the session is created.

#### Scenario: Bootstrapping a first session from profile defaults
- **WHEN** no sessions exist and the user triggers a scan for the first time
- **THEN** the system automatically creates an implicit session using the profile's current skills, seniority, and work mode as search parameters and associates the resulting matches with that session

