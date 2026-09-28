# Spec Delta

## MODIFIED Requirements

### Requirement: Client-Provided Apify API Token Configuration
The system SHALL allow users to locally store, view masked, update, and clear an Apify API token in the client Profile settings section alongside their OpenAI API key. The Apify token SHALL never be persisted in any application database.

#### Scenario: Saving and viewing an Apify API token
- **WHEN** the user inputs an Apify token in the Profile settings section and confirms
- **THEN** the token is stored in browser local storage and subsequent scans include the token in the `X-Apify-Token` header

#### Scenario: Clearing an Apify API token
- **WHEN** the user removes their stored Apify token from Profile settings
- **THEN** local storage is cleared of the token and subsequent scan requests omit the `X-Apify-Token` header

### Requirement: Programmatic Key Modal Prompt
The system SHALL display a minimal programmatic prompt modal when a scan attempt is triggered without an OpenAI API key saved in browser storage.

#### Scenario: Scan initiated without OpenAI API key
- **WHEN** the user clicks "Scan & Evaluate Jobs" while no OpenAI API key is saved
- **THEN** the system opens a focused prompt modal requiring an OpenAI key to proceed, without disrupting existing tab state
