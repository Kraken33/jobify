# Spec Delta

## ADDED Requirements

### Requirement: Header Navigation Tabs and Layout
The system SHALL provide a top navigation header with tabs for **Matches**, **Applied**, and **Profile**, allowing the user to seamlessly switch views. The header navigation bar SHALL NOT contain persistent API key configuration buttons or key status badges.

#### Scenario: Switching between main tabs
- **WHEN** the user clicks on the "Applied" tab in the header navigation
- **THEN** the system activates the Applied view, displaying applied job matches and highlighting the Applied navigation tab with an applied match count badge when matches exist

#### Scenario: Clean header layout
- **WHEN** the navigation header is rendered
- **THEN** the header displays the brand logo and the navigation tab group (Matches, Applied, Profile) without displaying OpenAI API key or Apify token buttons in the header right section

### Requirement: Profile Tab Settings Section
The system SHALL provide an inline **API Keys & Settings** section within the Profile tab for managing OpenAI API keys and Apify API tokens locally in the browser.

#### Scenario: Managing API keys inside Profile settings
- **WHEN** the user accesses the Profile tab and views the Settings section
- **THEN** the system provides input fields and action buttons to configure, save, view masked, or remove the OpenAI API key and Apify API token directly within the Profile page

## MODIFIED Requirements

### Requirement: Client-Side OpenAI API Key Management
The system SHALL allow users to enter their personal OpenAI API key, which MUST be stored exclusively in client-side storage (`localStorage`) and NEVER persisted to the application database. Users can manage this key from the inline Settings section of the Profile tab or through a programmatic prompt modal when attempting a scan without a configured key.

#### Scenario: User configures OpenAI API key
- **WHEN** the user inputs an OpenAI API key into the Profile settings interface or prompt modal and clicks save
- **THEN** the application validates the key format, saves it to browser `localStorage`, and displays an active key indicator in the settings section

#### Scenario: Key forwarded during match request
- **WHEN** the user initiates a job scan or matching request
- **THEN** the client reads the API key from `localStorage` and includes it in the secure request payload to the matching endpoint
