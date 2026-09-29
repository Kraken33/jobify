# Spec Delta

## ADDED Requirements

### Requirement: Total Vacancies and Prefetch Batch Sizing Control
The system SHALL surface the total number of matching vacancies available for the current search session and allow the user to select or configure a custom batch size for scan execution directly next to the session reset controls.

#### Scenario: Total vacancy count displayed in session controls
- **WHEN** a user views an active search session on the matches board
- **THEN** the session header displays a dropdown button showing the total matching vacancy count for that session's criteria and the current prefetch batch size

#### Scenario: Selecting a preset prefetch batch size
- **WHEN** a user opens the total vacancies dropdown and selects a preset batch amount (e.g., 5, 10, 20, 50)
- **THEN** the prefetch batch size for the session is updated, and the primary scan trigger button text updates to reflect the chosen batch count (e.g., "Scan Batch (20)")

#### Scenario: Setting a custom prefetch batch size
- **WHEN** a user selects "Set Custom Batch Amount..." as the last item in the total vacancies dropdown
- **THEN** the system prompts the user for a custom numeric batch limit, updates the active session batch size, and uses that limit for subsequent batch scan requests
