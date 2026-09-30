# Spec Delta

## MODIFIED Requirements

### Requirement: Vacancy Dismissal
The system SHALL allow users to dismiss any job match card from the active matches list. A dismissed match SHALL be hidden from the active board for the current session. The dismissed status SHALL be persisted in the Supabase `job_matches` table under the `status` column as `'dismissed'` matched by `provider_job_id` and `session_id`, so that the card remains hidden across page reloads. Dismissal SHALL NOT add the job ID to the session's `seenJobIds` checkpoint; it is a display-only action.

#### Scenario: User dismisses a vacancy
- **WHEN** the user clicks the "Not for me" action on a job match card
- **THEN** the card is immediately removed from the active matches list and the match's `status` is set to `'dismissed'` and persisted to Supabase `job_matches` by its provider job ID

#### Scenario: Dismissed vacancy absent after page reload
- **WHEN** the user reloads the page after dismissing a vacancy
- **THEN** the dismissed match does not appear in the active matches list for that session

#### Scenario: Dismissed vacancy can still reappear from a future scan
- **WHEN** the user triggers a new scan batch after dismissing a job
- **THEN** the engine may return the same job listing again (because dismiss does not alter `seenJobIds`), and it will be shown as a new match

### Requirement: Applied Status Tracking
The system SHALL allow users to mark any job match card as applied. Marking a match as applied SHALL set its `status` to `'applied'` and persist it to the Supabase `job_matches` table matching `provider_job_id`, so that applied vacancies are queried and visible across all sessions in the global Applied board. Subsequent scans or page reloads SHALL NOT overwrite an applied vacancy's status back to active.

#### Scenario: User marks a vacancy as applied
- **WHEN** the user clicks the "Applied" action on a job match card
- **THEN** the match's `status` is set to `'applied'`, the card is removed from the active matches list, and the match is updated in Supabase `job_matches` with `status = 'applied'` by provider job ID

#### Scenario: Applied vacancy persists across sessions and reloads
- **WHEN** the user switches to a different search session, reloads the page, or triggers a new batch scan
- **THEN** the applied vacancy remains visible in the Applied section loaded from Supabase and does not reappear as an active match opportunity
