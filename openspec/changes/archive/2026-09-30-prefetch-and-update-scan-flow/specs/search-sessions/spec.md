# Spec Delta

## MODIFIED Requirements

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
