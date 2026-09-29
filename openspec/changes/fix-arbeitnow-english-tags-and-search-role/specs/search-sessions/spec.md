# Spec Delta

## MODIFIED Requirements

### Requirement: Search Session Entity
The system SHALL allow users to create and maintain one or more named search sessions, each holding its own provider selection (`justjoin`, `arbeitsagentur`, or `arbeitnow`), target role (`targetRole`), provider search parameters (skills, seniority, work mode, location, spoken languages with target CEFR levels), and provider-specific options (`providerOptions` such as Arbeitnow endpoint mode) independently of the candidate identity profile.

#### Scenario: Creating a new search session
- **WHEN** a user creates a new search session with a name, designated provider (`justjoin`, `arbeitsagentur`, or `arbeitnow`), target role, and a set of provider search parameters (skills, seniority, work mode, optional location, optional spoken languages, optional provider options)
- **THEN** the system persists the session with a unique ID and an empty cursor state, ready for its first scan

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

### Requirement: Profile as Default Session Template
The system SHALL use the candidate profile's target role, skills, seniority, work mode, and spoken language fields as default values when bootstrapping a new search session, while the session's own parameters are the authoritative source for all provider queries once the session is created.

#### Scenario: Bootstrapping a first session from profile defaults
- **WHEN** no sessions exist and the user triggers a scan for the first time
- **THEN** the system automatically creates an implicit session using the profile's current target role, skills, seniority, work mode, and spoken languages as search parameters and associates the resulting matches with that session
