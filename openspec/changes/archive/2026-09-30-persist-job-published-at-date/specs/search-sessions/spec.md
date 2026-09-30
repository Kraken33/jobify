# Spec Delta

## MODIFIED Requirements

### Requirement: Session-Scoped Matches
The system SHALL associate each job match result with the search session that produced it in the Supabase `job_matches` table, so that matches from different sessions are stored, queried, and displayed independently across context switches. The system SHALL enforce uniqueness per session and provider job ID, and SHALL deduplicate records when loading session matches so that identical listings are never displayed multiple times. The system SHALL persist the vacancy's original publication timestamp (`published_at`) to `job_matches` and rehydrate it on reload so that card publication dates and day-based sorting accurately reflect when the job was posted rather than the scan insertion date.

#### Scenario: Matches isolated per session
- **WHEN** a scan completes for session A
- **THEN** the resulting match cards appear only under session A, are persisted with `session_id` pointing to session A in Supabase, and are not visible when session B is the active session

#### Scenario: Context switching preserves session matches
- **WHEN** the user switches from session A to session B and then back to session A
- **THEN** the matches board restores the exact matches and evaluation results previously scored for session A from Supabase without requiring a re-scan

#### Scenario: Deduplicated match loading across page reloads
- **WHEN** a user reloads the application for an active search session
- **THEN** the system loads matches for that session deduplicated by `provider_job_id` and does not display inflated or duplicated match counts

#### Scenario: Preserving publication timestamps across page reloads
- **WHEN** a user reloads the application or navigates across sessions with existing saved matches
- **THEN** each loaded vacancy retains its original `publishedAt` date value, card date labels render the actual relative or formatted calendar date instead of defaulting to "Today", and "Newest" sort orders vacancies by their original publication day
