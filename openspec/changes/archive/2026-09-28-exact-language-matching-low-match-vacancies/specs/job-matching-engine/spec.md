# Spec Delta

## MODIFIED Requirements

### Requirement: Pre-filtering Against Hard Constraints
The system SHALL evaluate fetched job listings against non-negotiable user constraints (such as remote work requirement, incompatible seniority bounds, insufficient salary threshold, or missing required spoken languages). Rather than discarding or hiding non-matching listings, the system SHALL convert hard constraint failures into low-match evaluations with a fit score of 25%, verdict `Low Match`, and explicit gap explanations. Listings whose provider job ID is present in the active session's `seenJobIds` set SHALL continue to be skipped entirely to prevent duplicate evaluations.

#### Scenario: Listing with hard constraint mismatch included as low match
- **WHEN** a candidate profile specifies strictly remote work and a fetched listing is strictly on-site in an unrelated city
- **THEN** the system assigns the listing a low-match evaluation (score 25%, verdict `Low Match`, gap describing the work mode mismatch) and includes it in the scan results instead of hiding it

#### Scenario: Listing rejected due to spoken language level gap included as low match
- **WHEN** a job listing requires spoken languages (e.g. English B2 and Polish C2) and the candidate profile lacks one or more required languages or specifies a lower CEFR level (e.g. candidate has English B2 but no Polish)
- **THEN** the system evaluates the candidate against all required languages and assigns a low-match evaluation (score 25%, verdict `Low Match`, gap listing missing required language `Polish`) included in the scan results

#### Scenario: Already-seen listing skipped
- **WHEN** a fetched listing's provider job ID matches an entry in the active session's `seenJobIds` set
- **THEN** the system skips that listing entirely — it is neither evaluated nor included in the results — and the seen-IDs set is not modified for that listing

### Requirement: Ranked Matches Display with External Application Links
The system SHALL present all evaluated job matches in descending order of fit score. Fully eligible jobs scored by the AI matcher SHALL appear at the top, while non-matching listings with low-match evaluations (score 25%) SHALL appear at the very bottom, highlighting match percentage, key pros, constraint gap reasons, and direct external application links.

#### Scenario: Viewing ranked matches with low-match vacancies at the bottom
- **WHEN** an evaluation scan finishes containing both eligible and constraint-failing job listings
- **THEN** the user interface displays all parsed job cards ordered from highest fit score to lowest, with high/medium AI matches displayed first and hard constraint mismatches rendered at the very bottom of the feed
