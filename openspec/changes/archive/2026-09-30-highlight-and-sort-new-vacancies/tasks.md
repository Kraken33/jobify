# Tasks

## 1. UI Components and Highlighting

- [x] 1.1 Update `JobCard.tsx` to support an `isNew?: boolean` property, displaying a `✨ New` pill badge and highlighted glowing border styling when true. Verify component rendering and props.
- [x] 1.2 Update `page.tsx` state to track `newlyFetchedJobIds`, appending IDs of newly discovered unique matches upon scan completion and resetting when session is cleared. Verify state update behavior.
- [x] 1.3 Update `JobCard.tsx` to display the formatted publication date ("Today", "Yesterday", or `DD.MM.YYYY`) in the job metadata section. Verify date rendering on job cards.

## 2. Sorting by Newest and Fit Score

- [x] 2.1 Update `MatchesBoard.tsx` to add `'newest'` ("Newest (Date & Fit)") to the sort dropdown, implementing a comparator that sorts by publication day (descending) and ties broken by AI fit score (descending). Verify sorting logic.
- [x] 2.2 Pass `newlyFetchedJobIds` from `MatchesBoard` down to `JobCard` items and ensure that switching sort modes or filters preserves visual highlighting on newly fetched vacancies. Verify UI interaction.
- [x] 2.3 Render visual day group dividers ("Today", "Yesterday", or `DD.MM.YYYY`) in `MatchesBoard.tsx` when sorting by `"newest"`. Verify day dividers between different date groups.

## 3. Testing and Verification

- [x] 3.1 Add unit tests covering the date + fit score sorting comparator and `isNew` match badge logic, and verify all tests pass (`npm test`).
- [x] 3.2 Add unit tests covering publication date formatting helper and day group transition logic, and verify all tests pass (`npm test`).
