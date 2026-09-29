# Spec Delta

## MODIFIED Requirements

### Requirement: Search Session Entity
The system SHALL allow users to create and maintain one or more named search sessions, each holding its own provider selection (`justjoin`, `arbeitsagentur`, or `arbeitnow`), target role (`targetRole`), provider search parameters (skills, seniority, work mode, location, spoken languages with target CEFR levels), and provider-specific options (`providerOptions` such as Arbeitnow endpoint mode) independently of the candidate identity profile. The system SHALL persist all search sessions in the Supabase `search_sessions` table with full schema support for `target_role`, `spoken_languages`, and `provider_options`. When initiating scans or vacancy counts, the client SHALL forward the complete active session object to server endpoints.

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

### Requirement: Session-Scoped Matches
The system SHALL associate each job match result with the search session that produced it in the Supabase `job_matches` table, so that matches from different sessions are stored, queried, and displayed independently across context switches.

#### Scenario: Matches isolated per session
- **WHEN** a scan completes for session A
- **THEN** the resulting match cards appear only under session A, are persisted with `session_id` pointing to session A in Supabase, and are not visible when session B is the active session

#### Scenario: Context switching preserves session matches
- **WHEN** the user switches from session A to session B and then back to session A
- **THEN** the matches board restores the exact matches and evaluation results previously scored for session A from Supabase without requiring a re-scan

### Requirement: Profile as Default Session Template
The system SHALL use the candidate profile's skills, seniority, work mode, and spoken language fields as default values when bootstrapping a new search session in Supabase, while the session's own parameters are the authoritative source for all provider queries once the session is created.

#### Scenario: Bootstrapping a first session from profile defaults
- **WHEN** no sessions exist for the current profile in Supabase and the user loads the app or triggers a scan
- **THEN** the system automatically creates an implicit session using the profile's current skills, seniority, work mode, and spoken languages, persists it in Supabase, and associates subsequent matches with that session
