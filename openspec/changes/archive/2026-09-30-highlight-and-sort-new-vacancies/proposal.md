# Proposal

## Why

When scanning or updating a search track, users often receive newly discovered job vacancies that get intermingled with previously existing vacancies based purely on fit score or salary. Without distinct visual cues, users cannot immediately tell which vacancies were just discovered in the latest scan versus older ones. Furthermore, users lack a dedicated sort option to review the freshest postings ordered by date and fit score, and lack clear visual date dividers and published date indicators on vacancy cards.

## What Changes

- Track newly evaluated job matches in frontend memory (`newlyFetchedJobIds`) across scans within the active session.
- Add distinct visual highlighting to newly fetched vacancies (an eye-catching `✨ New` pill badge and glowing accent border).
- Add a **"Newest (Date & Match)"** sorting mode that orders vacancies primarily by publication day (newest first) and secondarily by AI fit score (highest first within each day), falling back to match evaluation creation time if publication date is unavailable.
- Display the formatted publication date (e.g. "Today", "Yesterday", or `DD.MM.YYYY`) directly on each vacancy card.
- Render day group dividers/headers ("Today", "Yesterday", `DD.MM.YYYY`) when sorting by "Newest (Date & Fit)".
- Ensure sort selection in `MatchesBoard` seamlessly accommodates "Newest", "Fit Score", and "Salary".
- Retain newly fetched highlight markers in client memory until the page is reloaded or the track/session is reset.

## Capabilities

### Modified Capabilities
- `job-matching-engine`: Add requirements for highlighting newly scanned matches, displaying vacancy publication dates, rendering day group dividers, and sorting matches by newest date with secondary match score ranking.

## Impact

- `src/components/MatchesBoard.tsx`: Update sort options, vacancy sorting comparator, day group separation rendering, and pass `isNew` to cards.
- `src/components/JobCard.tsx`: Add support for `isNew` highlight styling, `✨ New` badge, and publication date display.
- `src/app/page.tsx`: Maintain `newlyFetchedJobIds` state and update it on successful scan results.
