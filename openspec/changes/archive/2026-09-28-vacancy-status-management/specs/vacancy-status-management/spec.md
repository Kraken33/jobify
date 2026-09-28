# Spec Delta

## Purpose

Enables users to act on individual job match cards by dismissing vacancies that are not a good fit and marking vacancies they have applied to, providing a lightweight application pipeline alongside the AI-scored matches list.

## ADDED Requirements

### Requirement: Vacancy Dismissal
The system SHALL allow users to dismiss any job match card from the active matches list. A dismissed match SHALL be hidden from the active board for the current session. The dismissed status SHALL be persisted in `localStorage` as part of the match record so that the card remains hidden across page reloads. Dismissal SHALL NOT add the job ID to the session's `seenJobIds` checkpoint; it is a display-only action.

#### Scenario: User dismisses a vacancy
- **WHEN** the user clicks the "Not for me" action on a job match card
- **THEN** the card is immediately removed from the active matches list and the match's `status` is set to `'dismissed'` and persisted to `localStorage`

#### Scenario: Dismissed vacancy absent after page reload
- **WHEN** the user reloads the page after dismissing a vacancy
- **THEN** the dismissed match does not appear in the active matches list for that session

#### Scenario: Dismissed vacancy can still reappear from a future scan
- **WHEN** the user triggers a new scan batch after dismissing a job
- **THEN** the engine may return the same job listing again (because dismiss does not alter `seenJobIds`), and it will be shown as a new match

### Requirement: Applied Status Tracking
The system SHALL allow users to mark any job match card as applied. Marking a match as applied SHALL set its `status` to `'applied'` and persist it to a **global** `localStorage` key (`jobify:applied`) independent of any search session, so that applied vacancies are visible across all sessions.

#### Scenario: User marks a vacancy as applied
- **WHEN** the user clicks the "Applied" action on a job match card
- **THEN** the match's `status` is set to `'applied'`, the card is removed from the active matches list, and the match is added to the global applied store in `localStorage`

#### Scenario: Applied vacancy persists across sessions
- **WHEN** the user switches to a different search session or reloads the page
- **THEN** the applied vacancy remains visible in the Applied section, regardless of which session originally surfaced it

### Requirement: Applied Section on Matches Board
The system SHALL display a dedicated Applied section on the Matches Board showing all globally applied vacancies. The Applied section SHALL be accessible via a tab or toggle alongside the active matches list and SHALL display a count of applied vacancies.

#### Scenario: User views Applied section with applied vacancies
- **WHEN** the user navigates to the Applied tab on the Matches Board
- **THEN** all vacancies previously marked as applied are displayed, ordered by the time they were applied (most recent first)

#### Scenario: Applied section is empty on first use
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
