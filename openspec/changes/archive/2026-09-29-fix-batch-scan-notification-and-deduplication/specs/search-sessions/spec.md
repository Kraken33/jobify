# Search Sessions Specification Delta

## MODIFIED Requirements

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
