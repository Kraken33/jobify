# Spec Delta

## MODIFIED Requirements

### Requirement: Candidate Profile Form Configuration
The system SHALL provide a candidate profile form allowing users to specify their identity and LLM scoring context: target role, seniority level, primary tech stack skills, salary expectations, spoken languages with CEFR proficiency levels (A1, A2, B1, B2, C1, C2, Native), and a summary of their professional background. Provider-specific search parameters (skills, work mode, location, spoken languages) are managed through search sessions and are not the primary purpose of the profile form.

#### Scenario: User saves candidate profile
- **WHEN** the user fills out all required fields (target role, seniority, preferred work mode, skills as defaults, spoken languages with CEFR levels) and submits the profile form
- **THEN** the system persists the profile details including spoken languages and displays a confirmation message. If an implicit default search session exists that was bootstrapped from the profile, its parameters are NOT automatically updated to reflect profile changes — the session's search parameters are authoritative once created.

#### Scenario: User updates existing profile
- **WHEN** a user modifies LLM-context fields (target role, experience summary, min salary, spoken languages) and submits the form
- **THEN** the system updates the stored profile record and the new context is used for AI evaluation in subsequent scans, without resetting any session's pagination cursor
