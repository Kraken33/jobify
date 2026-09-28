# Spec Delta

## MODIFIED Requirements

### Requirement: Candidate Profile Form Configuration
The system SHALL provide a candidate profile form allowing users to specify their identity and LLM scoring context: target role, seniority level, primary tech stack skills (as a default template for new sessions), salary expectations, and a summary of their professional background. Provider-specific search parameters (skills, work mode, location) are managed through search sessions and are not the primary purpose of the profile form.

#### Scenario: User saves candidate profile
- **WHEN** the user fills out all required fields (target role, seniority, preferred work mode, skills as defaults) and submits the profile form
- **THEN** the system persists the profile details and displays a confirmation message. If an implicit default search session exists that was bootstrapped from the profile, its parameters are NOT automatically updated to reflect profile changes — the session's search parameters are authoritative once created.

#### Scenario: User updates existing profile
- **WHEN** a user modifies LLM-context fields (target role, experience summary, min salary) and submits the form
- **THEN** the system updates the stored profile record and the new context is used for AI evaluation in subsequent scans, without resetting any session's pagination cursor

### Requirement: Client-Side OpenAI API Key Management
The system SHALL allow users to enter their personal OpenAI API key, which MUST be stored exclusively in client-side storage (`localStorage`) and NEVER persisted to the application database.

#### Scenario: User configures OpenAI API key
- **WHEN** the user inputs an OpenAI API key into the settings interface and clicks save
- **THEN** the application validates the key format, saves it to browser `localStorage`, and displays an active key indicator

#### Scenario: Key forwarded during match request
- **WHEN** the user initiates a job scan or matching request
- **THEN** the client reads the API key from `localStorage` and includes it in the secure request payload to the matching endpoint
