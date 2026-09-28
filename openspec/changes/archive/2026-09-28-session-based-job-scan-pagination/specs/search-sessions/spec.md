# Spec Delta

## Purpose

Provides named, persistent job-hunt tracks that pair a set of provider-level search parameters (skills, seniority, work mode, location) with a pagination cursor and a seen-job deduplication set, enabling users to run multiple independent, stateful job searches simultaneously without mixing their result pools or replay positions.

## ADDED Requirements

### Requirement: Search Session Entity
The system SHALL allow users to create and maintain one or more named search sessions, each holding its own provider search parameters independently of the candidate identity profile.

#### Scenario: Creating a new search session
- **WHEN** a user creates a new search session with a name and a set of provider search parameters (skills, seniority, work mode, optional location)
- **THEN** the system persists the session with a unique ID and an empty cursor state, ready for its first scan

#### Scenario: Multiple concurrent sessions
- **WHEN** a user has two or more active search sessions with different search parameters (e.g. "Full Stack" with React/Node skills and "JavaScript Engineer" with JavaScript/TypeScript skills)
- **THEN** each session independently maintains its own pagination cursor and seen-job set, and scans from one session do not affect the cursor or match list of another

### Requirement: Session Selection in the UI
The system SHALL provide a UI control for switching between active search sessions on the matches board, displaying each session's name, provider, and last scanned timestamp.

#### Scenario: Switching between sessions
- **WHEN** the user selects a different session from the session switcher
- **THEN** the matches board displays only the matches associated with the selected session and the scan controls reflect that session's cursor state

### Requirement: Session-Scoped Matches
The system SHALL associate each job match result with the search session that produced it, so that matches from different sessions are stored and displayed independently.

#### Scenario: Matches isolated per session
- **WHEN** a scan completes for session A
- **THEN** the resulting match cards appear only under session A and are not visible when session B is the active session

### Requirement: Profile as Default Session Template
The system SHALL use the candidate profile's skills, seniority, and work mode fields as default values when bootstrapping a new search session, while the session's own parameters are the authoritative source for all provider queries once the session is created.

#### Scenario: Bootstrapping a first session from profile defaults
- **WHEN** no sessions exist and the user triggers a scan for the first time
- **THEN** the system automatically creates an implicit session using the profile's current skills, seniority, and work mode as search parameters and associates the resulting matches with that session
