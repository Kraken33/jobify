# Tasks

## 1. Header Navigation Refactoring

- [x] 1.1 Update `NavbarProps` interface and `Navbar.tsx` component to accept `activeTab: 'matches' | 'applied' | 'profile'` and `appliedCount?: number`, and remove API key props/triggers from header. Verify navigation renders cleanly without key buttons.
- [x] 1.2 Add the **Applied** tab to the nav controls in `Navbar.tsx` alongside Matches and Profile with the applied count badge. Verify clicking Applied calls `onTabChange('applied')`.

## 2. API Keys & Settings Section in Profile

- [x] 2.1 Add an inline **API Keys & Settings** card section to `ProfileForm.tsx` (or a dedicated settings sub-component within Profile) that permits entering, masking/viewing, saving, and removing OpenAI API Key and Apify API Token. Verify keys persist to `localStorage` using existing storage utilities.
- [x] 2.2 Add callbacks or handlers to notify parent state when API keys/tokens are saved or cleared from the Profile settings section.

## 3. Dedicated Applied View & Matches Board Clean Up

- [x] 3.1 Create `AppliedBoard.tsx` component to display the list of applied job matches with company info, fit score, pros, missing skill gaps, external link, and a remove-from-applied action. Verify applied jobs render cleanly in a standalone view.
- [x] 3.2 Clean up `MatchesBoard.tsx` by removing the embedded applied matches section, focusing `MatchesBoard.tsx` exclusively on active/pending matches.

## 4. Main Page App Wiring & Minimal Prompt Modal

- [x] 4.1 Update `src/app/page.tsx` state to support `'matches' | 'applied' | 'profile'` tab navigation and pass `appliedMatches.length` to `Navbar`. Verify switching between all three tabs correctly mounts `MatchesBoard`, `AppliedBoard`, and `ProfileForm`.
- [x] 4.2 Simplify `ApiKeyModal.tsx` into a minimal programmatic prompt modal for missing OpenAI keys during scan attempts. Update `handleTriggerScan` in `page.tsx` to trigger this minimal modal when no OpenAI API key is configured. Verify scanning without a key opens the prompt modal cleanly.
