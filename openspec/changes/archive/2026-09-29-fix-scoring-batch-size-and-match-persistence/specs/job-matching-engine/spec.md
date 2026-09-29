# Spec Delta

## MODIFIED Requirements

### Requirement: Pre-filtering Against Hard Constraints
The system SHALL evaluate all fetched job listings against user profile constraints (remote work, seniority bounds, salary, and spoken languages). Non-matching listings SHALL NOT be discarded or hidden; instead, the system SHALL convert hard constraint failures into low-match evaluations with a fit score of 25%, verdict `Low Match`, and explicit gap explanations, completely bypassing LLM evaluation to conserve API quota while ensuring every fetched vacancy remains visible to the user. Listings whose provider job ID is present in the active session's `seenJobIds` set SHALL continue to be skipped to prevent re-evaluating already processed jobs.

#### Scenario: Listing with hard constraint mismatch included as low match without LLM evaluation
- **WHEN** a candidate profile specifies strictly remote work and a fetched listing is strictly on-site in an unrelated city
- **THEN** the system assigns the listing a low-match evaluation (score 25%, verdict `Low Match`, gap describing the work mode mismatch), skips sending the listing to OpenAI, and includes it at the bottom of the scan results

#### Scenario: Listing rejected due to spoken language level gap included as low match
- **WHEN** a job listing requires spoken languages (e.g. English B2 and Polish C2) and the candidate profile lacks one or more required languages or specifies a lower CEFR level (e.g. candidate has English B2 but no Polish)
- **THEN** the system evaluates the candidate against all required languages and assigns a low-match evaluation (score 25%, verdict `Low Match`, gap listing missing required language `Polish`) included in the scan results without invoking OpenAI

#### Scenario: Already-seen listing skipped
- **WHEN** a fetched listing's provider job ID matches an entry in the active session's `seenJobIds` set
- **THEN** the system skips that listing entirely — it is neither evaluated nor included in the results — and the seen-IDs set is not modified for that listing

### Requirement: OpenAI Structured Fit Evaluation
The system SHALL submit eligible job descriptions along with the candidate's profile (including target role, seniority, skills, work mode, and spoken languages with CEFR levels) to the OpenAI API using the user's provided API key, evaluating all eligible listings up to the requested batch limit (`limit` or `maxScanLimit`) without imposing an arbitrary static evaluation cap, receiving a structured evaluation containing an overall fit score (0-100), key matching pros, critical missing skill gaps, and a concise summary.

In addition, when the job listing's `spokenLanguages` field is absent or empty but a non-empty description is present, the system SHALL instruct the LLM to inspect the job description text and determine whether it explicitly requires spoken languages that the candidate's profile does not cover. If the LLM detects such an unsatisfied language requirement, it SHALL include it as a gap in the structured evaluation and reflect an appropriately reduced fit score.

#### Scenario: Successful fit evaluation
- **WHEN** the matching engine sends the candidate profile and normalized job details to OpenAI
- **THEN** OpenAI returns a valid structured JSON object with `score` (0 to 100), `pros` list, `gaps` list, and `summary` text

#### Scenario: Evaluating full requested batch size
- **WHEN** 20 unseen job listings pass hard constraints and the scan request specifies a batch limit of 20
- **THEN** the system evaluates all 20 eligible listings with OpenAI in parallel batches and returns all 20 scored match results

#### Scenario: Invalid or expired API key
- **WHEN** a match request is sent with an invalid or quota-exceeded OpenAI API key
- **THEN** the system catches the authentication/quota error and prompts the user to verify their API key in settings

### Requirement: Session-Scoped Scan Execution
The system SHALL accept an optional `session` object or `sessionId` on the scan endpoint to identify and configure the active search session, along with an optional client-provided Apify API token via request header or payload. When `session` is provided in the request body, the system SHALL prioritize its parameters (including `targetRole`, `providerOptions`, `skills`, `seniority`, `workMode`, `location`, `spokenLanguages`) over default profile settings and database lookups. It SHALL load the session's checkpoint (provider fingerprint, `publishedAtCursor`, `seenJobIds`), pass the cursor and Apify token to the provider adapter, and persist the updated checkpoint, seen-ID set, and newly scored match records idempotently after each successful scan.

#### Scenario: Scan with client-provided session payload
- **WHEN** the client triggers a scan and provides the full `session` object in the request body
- **THEN** the system applies the session's designated `targetRole`, `providerOptions`, `skills`, and filters directly to the provider search criteria without falling back to profile defaults, regardless of whether a database session record exists

#### Scenario: Consecutive batch scans advance provider pagination
- **WHEN** a user triggers multiple consecutive scans on a provider track with remaining vacancies
- **THEN** each scan advances the pagination state (page number and/or cursor), processes unseen listings without stalling, and appends the new matches to the session results
