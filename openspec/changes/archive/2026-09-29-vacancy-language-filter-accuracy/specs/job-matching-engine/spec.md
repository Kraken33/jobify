# Spec Delta

## MODIFIED Requirements

### Requirement: OpenAI Structured Fit Evaluation
The system SHALL submit eligible job descriptions along with the candidate's profile (including target role, seniority, skills, work mode, and spoken languages with CEFR levels) to the OpenAI API using the user's provided API key, receiving a structured evaluation containing an overall fit score (0-100), key matching pros, critical missing skill gaps, and a concise summary.

In addition, when the job listing's `spokenLanguages` field is absent or empty but a non-empty description is present, the system SHALL instruct the LLM to inspect the job description text and determine whether it explicitly requires spoken languages that the candidate's profile does not cover. If the LLM detects such an unsatisfied language requirement, it SHALL include it as a gap in the structured evaluation and reflect an appropriately reduced fit score.

#### Scenario: Successful fit evaluation
- **WHEN** the matching engine sends the candidate profile and normalized job details to OpenAI
- **THEN** OpenAI returns a valid structured JSON object with `score` (0 to 100), `pros` list, `gaps` list, and `summary` text

#### Scenario: Invalid or expired API key
- **WHEN** a match request is sent with an invalid or quota-exceeded OpenAI API key
- **THEN** the system catches the authentication/quota error and prompts the user to verify their API key in settings

#### Scenario: LLM detects language requirement in description when spokenLanguages field is missing
- **WHEN** a job listing has no `spokenLanguages` entries but the description contains explicit language requirements (e.g., "Fluent Polish required" or "Komunikacja w języku polskim") and the candidate's profile does not include that language
- **THEN** the AI matcher includes the missing language as a gap in the evaluation result and assigns a lower fit score reflecting the mismatch

#### Scenario: LLM finds no hidden language requirements
- **WHEN** a job listing has no `spokenLanguages` entries and the description does not contain explicit language requirements
- **THEN** the AI matcher proceeds with normal evaluation without penalizing the candidate for language gaps
