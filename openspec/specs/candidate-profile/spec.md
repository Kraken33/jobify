# Candidate Profile Specification

## Purpose
Provides user profile configuration for job preferences and secure client-side storage for the user's OpenAI API key.

## Requirements

### Requirement: Candidate Profile Form Configuration
The system SHALL provide a candidate profile form allowing users to specify their target roles, seniority level, primary tech stack skills, salary expectations, preferred work mode (remote, hybrid, on-site), and a summary of their professional background.

#### Scenario: User saves candidate profile
- **WHEN** the user fills out all required fields (target role, seniority, skills, preferred work mode) and submits the profile form
- **THEN** the system persists the profile details in Supabase and displays a confirmation message

#### Scenario: User updates existing profile
- **WHEN** a user modifies an existing field in their profile and submits the form
- **THEN** the system updates the stored profile record and reflects the new preferences in subsequent job searches

### Requirement: Client-Side OpenAI API Key Management
The system SHALL allow users to enter their personal OpenAI API key, which MUST be stored exclusively in client-side storage (`localStorage`) and NEVER persisted to the application database.

#### Scenario: User configures OpenAI API key
- **WHEN** the user inputs an OpenAI API key into the settings interface and clicks save
- **THEN** the application validates the key format, saves it to browser `localStorage`, and displays an active key indicator

#### Scenario: Key forwarded during match request
- **WHEN** the user initiates a job scan or matching request
- **THEN** the client reads the API key from `localStorage` and includes it in the secure request payload to the matching endpoint
