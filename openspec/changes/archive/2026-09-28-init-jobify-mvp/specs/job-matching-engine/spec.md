# Spec Delta: Job Matching Engine

## Purpose
Evaluates candidate profiles against fetched job listings using rule-based pre-filtering and OpenAI structured analysis to present ranked opportunities with application links.

## ADDED Requirements

### Requirement: Pre-filtering Against Hard Constraints
The system SHALL filter out candidate listings that violate non-negotiable user constraints (such as remote work requirement or incompatible seniority bounds) before invoking the LLM.

#### Scenario: Listing rejected by hard constraint
- **WHEN** a candidate profile specifies strictly remote work and a fetched listing is strictly on-site in an unrelated city
- **THEN** the system excludes the listing from LLM scoring to conserve API tokens and processing time

### Requirement: OpenAI Structured Fit Evaluation
The system SHALL submit eligible job descriptions along with the candidate's profile to the OpenAI API using the user's provided API key, receiving a structured evaluation containing an overall fit score (0-100), key matching pros, critical missing skill gaps, and a concise summary.

#### Scenario: Successful fit evaluation
- **WHEN** the matching engine sends the candidate profile and normalized job details to OpenAI
- **THEN** OpenAI returns a valid structured JSON object with `score` (0 to 100), `pros` list, `gaps` list, and `summary` text

#### Scenario: Invalid or expired API key
- **WHEN** a match request is sent with an invalid or quota-exceeded OpenAI API key
- **THEN** the system catches the authentication/quota error and prompts the user to verify their API key in settings

### Requirement: Ranked Matches Display with External Application Links
The system SHALL present scored matches in descending order of fit score, highlighting the match percentage, key pros, potential skill gaps, and a direct external link to the job posting.

#### Scenario: Viewing ranked matches
- **WHEN** an evaluation batch finishes
- **THEN** the user interface displays the job cards ordered from highest fit score to lowest, each containing a direct link opening the posting on JustJoin.it in a new tab
