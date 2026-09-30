# Vacancy Status Management Specification

## Purpose
Enables users to act on individual job match cards by dismissing vacancies that are not a good fit and marking vacancies they have applied to, providing a lightweight application pipeline alongside the AI-scored matches list.

## Requirements

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

### Requirement: Applied Status Tracking
The system SHALL allow users to mark any job match card as applied. Marking a match as applied SHALL set its `status` to `'applied'` and persist it to the Supabase `job_matches` table matching `provider_job_id`, so that applied vacancies are queried and visible across all sessions in the global Applied board. When loading applied matches across all sessions from Supabase, the system SHALL deduplicate records by `provider_job_id` so that each unique vacancy is represented exactly once regardless of duplicate database rows across sessions or repeated batch scans. Subsequent scans or page reloads SHALL NOT overwrite an applied vacancy's status back to active.

#### Scenario: User marks a vacancy as applied
- **WHEN** the user clicks the "Applied" action on a job match card
- **THEN** the match's `status` is set to `'applied'`, the card is removed from the active matches list, and the match is updated in Supabase `job_matches` with `status = 'applied'` by provider job ID

#### Scenario: Applied vacancy persists across sessions and reloads
- **WHEN** the user switches to a different search session, reloads the page, or triggers a new batch scan
- **THEN** the applied vacancy remains visible in the Applied section loaded from Supabase as a single unique entry, matching the count before page reload, and does not reappear as an active match opportunity

### Requirement: Applied Section on Matches Board
The system SHALL display a dedicated Applied section on the Matches Board showing all globally applied vacancies. The Applied section SHALL be accessible via a tab or toggle alongside the active matches list and SHALL display a count of applied vacancies.

#### Scenario: User views Applied section with applied vacancies
- **WHEN** the user navigates to the Applied tab on the Matches Board
- **THEN** all vacancies previously marked as applied are displayed, ordered by the time they were applied (most recent first)

#### Scenario: User views empty Applied section
- **WHEN** the user opens the Applied tab before marking any vacancy as applied
- **THEN** an empty state message is shown indicating no applications have been tracked yet

### Requirement: Separate View and Apply Actions
The system SHALL replace the existing single "Apply" button on job match cards with two distinct actions: a **View** action that opens the external job URL in a new browser tab without changing the vacancy's status, and an **Applied** action that marks the vacancy as applied.

#### Scenario: User clicks View
- **WHEN** the user clicks the "View" button on a job match card
- **THEN** the external job posting URL is opened in a new tab and the match's `status` remains unchanged

#### Scenario: User clicks Applied
- **WHEN** the user clicks the "Applied" button on a job match card
- **THEN** the match is marked as applied, moved to the global Applied list, and removed from the active board without navigating away
