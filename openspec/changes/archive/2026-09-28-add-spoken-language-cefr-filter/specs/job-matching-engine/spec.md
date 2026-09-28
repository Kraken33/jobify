# Spec Delta

## MODIFIED Requirements

### Requirement: Pre-filtering Against Hard Constraints
The system SHALL filter out candidate listings that violate non-negotiable user constraints (such as remote work requirement, incompatible seniority bounds, or insufficient spoken language CEFR proficiency) before invoking the LLM. It SHALL additionally skip any listing whose provider job ID is present in the active session's `seenJobIds` set, preventing duplicate AI evaluations and associated token costs.

#### Scenario: Listing rejected by hard constraint
- **WHEN** a candidate profile specifies strictly remote work and a fetched listing is strictly on-site in an unrelated city
- **THEN** the system excludes the listing from LLM scoring to conserve API tokens and processing time

#### Scenario: Listing rejected due to spoken language level gap
- **WHEN** a job listing requires a spoken language at CEFR level $L_{\text{job}}$ (e.g. German C1) and the candidate profile either lacks that language or specifies a lower CEFR level (e.g. German B1)
- **THEN** the system excludes the listing from LLM scoring with a clear pre-filtering exclusion reason

#### Scenario: Already-seen listing skipped
- **WHEN** a fetched listing's provider job ID matches an entry in the active session's `seenJobIds` set
- **THEN** the system skips that listing entirely — it is neither pre-filtered nor sent to the LLM — and the seen-IDs set is not modified for that listing

### Requirement: OpenAI Structured Fit Evaluation
The system SHALL submit eligible job descriptions along with the candidate's profile (including target role, seniority, skills, work mode, and spoken languages with CEFR levels) to the OpenAI API using the user's provided API key, receiving a structured evaluation containing an overall fit score (0-100), key matching pros, critical missing skill gaps, and a concise summary.

#### Scenario: Successful fit evaluation
- **WHEN** the matching engine sends the candidate profile and normalized job details to OpenAI
- **THEN** OpenAI returns a valid structured JSON object with `score` (0 to 100), `pros` list, `gaps` list, and `summary` text

#### Scenario: Invalid or expired API key
- **WHEN** a match request is sent with an invalid or quota-exceeded OpenAI API key
- **THEN** the system catches the authentication/quota error and prompts the user to verify their API key in settings

### Requirement: Provider Fingerprint Invalidation on Search-Parameter Change
The system SHALL compute a provider fingerprint from the session's provider-query parameters (skills, seniority, workMode, location, and spoken languages). When the session's search parameters change in a way that alters the fingerprint, the system SHALL reset the `publishedAtCursor` to null and clear the `seenJobIds` for that session, triggering a fresh full-pool scan on the next request. Changes to LLM-only profile fields (experienceSummary, targetRole, minSalary) SHALL NOT invalidate the cursor.

#### Scenario: Cursor reset when provider params change
- **WHEN** a session's skills, seniority, workMode, location, or spoken language filters are updated, producing a different fingerprint
- **THEN** the stored `publishedAtCursor` and `seenJobIds` for that session are cleared, and the next scan fetches the full pool for the new parameters

#### Scenario: Cursor preserved when only LLM params change
- **WHEN** the candidate profile's `experienceSummary`, `targetRole`, or `minSalary` are updated without changing the session's provider-query parameters
- **THEN** the session's `publishedAtCursor` and `seenJobIds` remain unchanged, and the next scan continues from where it left off
