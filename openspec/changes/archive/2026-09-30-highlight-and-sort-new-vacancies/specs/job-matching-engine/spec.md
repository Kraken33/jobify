# Spec Delta

## ADDED Requirements

### Requirement: Newly Evaluated Vacancy Visual Highlighting
The system SHALL maintain an in-memory collection of newly evaluated vacancy match IDs discovered during the current browser session. When rendering vacancy cards in the match list, the system SHALL render items belonging to this set with distinct visual highlighting, including a `✨ New` pill badge and an accent highlight border, until the session is reset, track is deleted, or page is reloaded.

#### Scenario: Highlighting vacancies from a subsequent scan
- **WHEN** a scan or update operation returns one or more new unique match results in the active session
- **THEN** each newly returned match card displays a `✨ New` badge and a distinct accent border to distinguish it from previously loaded vacancies

#### Scenario: Retaining highlights across filter and sort adjustments
- **WHEN** the user modifies minimum score filters or switches sorting modes after a scan
- **THEN** the newly evaluated vacancies retain their `✨ New` badge and highlight styling

#### Scenario: Clearing highlights on session reset
- **WHEN** the user triggers a session reset
- **THEN** the in-memory set of newly evaluated vacancy IDs is cleared

### Requirement: Vacancy Sorting by Newest Date and AI Match Score
The system SHALL provide a "Newest" sort mode in the match board sorting options. When selected, the system SHALL sort vacancies by their published calendar day (or evaluation creation date if published date is omitted) in descending order, with matches on the same day sorted by AI fit score in descending order.

#### Scenario: Sorting by Newest orders by day and breaks ties with fit score
- **WHEN** the user selects the "Newest" sort mode
- **THEN** vacancies published today appear before vacancies published on earlier dates, and within each day, vacancies with higher AI fit scores appear before vacancies with lower fit scores

#### Scenario: Switching between Fit Score, Salary, and Newest
- **WHEN** the user toggles between "Fit Score", "Salary", and "Newest" in the sort dropdown
- **THEN** the active match list re-sorts immediately according to the chosen ordering criteria without reloading the page

### Requirement: Vacancy Publication Date Display and Day Group Separation
The system SHALL display the publication date for each vacancy on its card formatted as "Today", "Yesterday", or `DD.MM.YYYY` (based on `publishedAt` or `createdAt`). Furthermore, when sorted by "Newest", the system SHALL render visual date dividers between different calendar days.

#### Scenario: Displaying formatted publication date on job card
- **WHEN** a vacancy is displayed in the matches list
- **THEN** the card renders the publication date tag (e.g. "Today", "Yesterday", or `DD.MM.YYYY`) alongside other job metadata

#### Scenario: Day group separation in Newest sort mode
- **WHEN** the match list is sorted by "Newest (Date & Fit)"
- **THEN** the system groups listings by day and renders day dividers separating "Today", "Yesterday", and earlier calendar days
