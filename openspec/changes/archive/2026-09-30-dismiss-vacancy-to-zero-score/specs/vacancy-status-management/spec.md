# Spec Delta

## MODIFIED Requirements

### Requirement: Vacancy Dismissal
The system SHALL allow users to dismiss any job match card by clicking the "Not for me" action. When dismissed, the system SHALL update the match's fit score to 0% (`fit_score = 0`), keep the match visible in the active matches list, and persist `fit_score = 0` to the Supabase `job_matches` table matched by `provider_job_id` so that the 0% score persists across page reloads. Dismissal SHALL NOT remove the job card from the matches list or change its status away from active. The "Not for me" dismiss button SHALL be hidden or disabled once a match score is 0%.

#### Scenario: User dismisses a vacancy
- **WHEN** the user clicks the "Not for me" action on a job match card
- **THEN** the match's score is updated to 0%, the card remains in the matches list, and `fit_score = 0` is persisted to Supabase `job_matches` by its provider job ID

#### Scenario: Dismissed vacancy absent after page reload
- **WHEN** the user reloads the page after dismissing a vacancy
- **THEN** the vacancy is loaded from Supabase with a 0% fit score and remains visible in the active matches list with its 0% score

#### Scenario: Dismissed vacancy can still reappear from a future scan
- **WHEN** the user triggers a new scan batch after dismissing a job
- **THEN** the engine deduplicates against the existing session match and maintains its 0% score

#### Scenario: 0% match position in sorted list
- **WHEN** matches are sorted by fit score
- **THEN** vacancies with 0% match score sink naturally to the bottom of the matches list

#### Scenario: Score filter excludes 0% matches
- **WHEN** a user sets a minimum score filter (e.g. 60%+ Match)
- **THEN** vacancies with 0% match score are filtered out, but remain visible when "All Matches" (0%+) is selected
