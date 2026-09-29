# Spec Delta

## MODIFIED Requirements

### Requirement: Search Session Entity
The system SHALL allow users to create and maintain one or more named search sessions, each holding its own provider selection (`justjoin`, `arbeitsagentur`, or `arbeitnow`), target role (`targetRole`), provider search parameters (skills, seniority, work mode, location, spoken languages with target CEFR levels), and provider-specific options (`providerOptions` such as Arbeitnow endpoint mode) independently of the candidate identity profile. When initiating scans or vacancy counts, the client SHALL forward the complete active session object to server endpoints to ensure custom session configurations apply even in offline or guest mode where sessions are only held in local storage.

#### Scenario: Creating a new search session
- **WHEN** a user creates a new search session with a name, designated provider (`justjoin`, `arbeitsagentur`, or `arbeitnow`), target role, provider-specific options, and a set of provider search parameters (skills, seniority, work mode, optional location, optional spoken languages)
- **THEN** the system persists the session with a unique ID, custom target role, and provider options, ready for its first scan

#### Scenario: Creating a new search session with profile inheritance
- **WHEN** a user opens the session creation modal and chooses to inherit from profile
- **THEN** the system pre-populates the session form with the candidate profile's current target role, skills, seniority, work mode, preferred location, and spoken languages with CEFR levels for customization

#### Scenario: Creating a new search session from scratch
- **WHEN** a user opens the session creation modal and chooses to create from scratch
- **THEN** the system displays empty parameter inputs allowing the user to configure a new track completely independent of profile defaults

#### Scenario: Deleting a search session
- **WHEN** a user deletes an active or inactive custom search session
- **THEN** the system removes the session record, its associated scan checkpoint, and its persisted match results, switching the active session to a remaining session

#### Scenario: Multiple concurrent sessions
- **WHEN** a user has two or more active search sessions with different search parameters (e.g. "Full Stack" with React/Node skills on JustJoin.it and "German Backend" with German B2 requirement on Arbeitsagentur)
- **THEN** each session independently maintains its own pagination cursor and seen-job set, and scans from one session route to its own provider without affecting the cursor or match list of another

### Requirement: Total Vacancies and Prefetch Batch Sizing Control
The system SHALL surface the total number of matching vacancies available for the current search session, forwarding the active search session payload with its target role and provider options to the vacancy count endpoint, and allow the user to select or configure a custom batch size for scan execution directly next to the session reset controls.

#### Scenario: Total vacancy count displayed in session controls
- **WHEN** a user views an active search session on the matches board
- **THEN** the client sends the active session object to the count endpoint, and the session header displays a dropdown button showing the total matching vacancy count for that session's criteria and the current prefetch batch size

#### Scenario: Selecting a preset prefetch batch size
- **WHEN** a user opens the total vacancies dropdown and selects a preset batch amount (e.g., 5, 10, 20, 50)
- **THEN** the prefetch batch size for the session is updated, and the primary scan trigger button text updates to reflect the chosen batch count (e.g., "Scan Batch (20)")

#### Scenario: Setting a custom prefetch batch size
- **WHEN** a user selects "Set Custom Batch Amount..." as the last item in the total vacancies dropdown
- **THEN** the system prompts the user for a custom numeric batch limit, updates the active session batch size, and uses that limit for subsequent batch scan requests
