# Spec Delta: Vacancy Status Management

## MODIFIED Requirements

### Requirement: Applied Status Tracking
The system SHALL allow users to mark any job match card as applied. Marking a match as applied SHALL set its `status` to `'applied'` and persist it to the Supabase `job_matches` table matching `provider_job_id`, so that applied vacancies are queried and visible across all sessions in the global Applied board. When loading applied matches across all sessions from Supabase, the system SHALL deduplicate records by `provider_job_id` so that each unique vacancy is represented exactly once regardless of duplicate database rows across sessions or repeated batch scans. Subsequent scans or page reloads SHALL NOT overwrite an applied vacancy's status back to active.

#### Scenario: User marks a vacancy as applied
- **WHEN** the user clicks the "Applied" action on a job match card
- **THEN** the match's `status` is set to `'applied'`, the card is removed from the active matches list, and the match is updated in Supabase `job_matches` with `status = 'applied'` by provider job ID

#### Scenario: Applied vacancy persists across sessions and reloads
- **WHEN** the user switches to a different search session, reloads the page, or triggers a new batch scan
- **THEN** the applied vacancy remains visible in the Applied section loaded from Supabase as a single unique entry, matching the count before page reload, and does not reappear as an active match opportunity
