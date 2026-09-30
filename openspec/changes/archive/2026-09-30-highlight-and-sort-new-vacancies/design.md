# Design

## Context

See [proposal.md](file:///Users/vanluv/develop/jobifyv2/openspec/changes/highlight-and-sort-new-vacancies/proposal.md) for motivation.

Currently, match results are stored in `page.tsx` state and filtered/sorted in `MatchesBoard.tsx`. We want to make date clarity crystal clear by displaying formatted publication dates on each card and rendering day group dividers when sorted by Newest.

## Goals / Non-Goals

**Goals:**
- Provide a clear visual highlight on `JobCard` for vacancies newly fetched during the current browser session.
- Add a "Newest" sort mode that orders listings by publication day (descending), ranking positions within the same day by AI fit score (descending).
- Display formatted publication dates on job cards (Today, Yesterday, `DD.MM.YYYY`).
- Render clear day section dividers in `MatchesBoard` when sorted by Newest.

**Non-Goals:**
- Modifying backend database schemas.

## Decisions

### 1. In-Memory Set for Newly Fetched Job IDs
- **Decision**: Manage `newlyFetchedJobIds: string[]` in `page.tsx` and pass `newMatchIds: Set<string>` down to `MatchesBoard` and `JobCard`.
- **Rationale**: Keeps state management lightweight, reactive, and localized to the user's active session without database migration overhead.

### 2. Day-Bucket + Fit Score Comparator for "Newest" Sort
- **Decision**: Normalize the date to calendar day (`setHours(0, 0, 0, 0)`) using `job.publishedAt` (falling back to `createdAt`). Sort primary by date bucket descending, and secondary by `evaluation.score` descending.

### 3. Date Formatting Helper & Card Metadata
- **Decision**: Provide a utility function `formatJobDate(dateStr)` that outputs:
  - `"Today"` if the date matches current local day
  - `"Yesterday"` if the date matches 1 day prior
  - `"DD.MM.YYYY"` for older dates
- **Rationale**: Human-readable, concise, and standard across international dates.

### 4. Day Group Dividers in MatchesBoard
- **Decision**: When `sortBy === 'newest'`, iterate through sorted listings and render a subtle, modern divider whenever the calendar day changes (e.g. `<div className="flex items-center gap-3 my-4">...<span>Today</span>...</div>`).
- **Rationale**: Creates immediate visual structure without fragmenting the underlying list or breaking keyboard navigation and filters.

## Risks / Trade-offs

- **[Timezones for day boundary calculation]** $\rightarrow$ Mitigated by comparing local calendar year, month, and day against the local current date.
