# Design

## Context

See `proposal.md` for motivation and background.

Currently:
- `Navbar.tsx` takes `activeTab: 'matches' | 'profile'`, `onTabChange`, `hasApiKey`, `apiKey`, `hasApifyToken`, `apifyToken`, `onOpenKeyModal`, `matchCount`. It renders BYOK status buttons on the right side.
- `page.tsx` maintains `activeTab` (`'matches' | 'profile'`), `appliedMatches`, and triggers `ApiKeyModal` via `isKeyModalOpen`.
- `ProfileForm.tsx` manages role, skills, preferences, spoken languages, and experience bio.
- `ApiKeyModal.tsx` contains key management for both OpenAI key and Apify token.

## Goals / Non-Goals

**Goals:**
- Update `Navbar.tsx` navigation tab type to `'matches' | 'applied' | 'profile'`.
- Remove key buttons and `onOpenKeyModal` prop from `Navbar.tsx`.
- Create `AppliedBoard.tsx` component to cleanly display `appliedMatches`.
- Incorporate inline **API Keys & Settings** into `ProfileForm.tsx` or as a unified section in `Profile` tab.
- Refactor `ApiKeyModal.tsx` into a lightweight prompt modal triggered only programmatically during scan attempts when no OpenAI API key is configured.

**Non-Goals:**
- Changing backend API endpoints or match evaluation logic.
- Changing storage key names in `apiKeyStorage.ts`.

## Decisions

1. **Header Navigation Updates (`Navbar.tsx`)**:
   - `activeTab` type changed to `'matches' | 'applied' | 'profile'`.
   - Applied button placed between Matches and Profile with an applied count badge (`appliedCount`).
   - Removed right-hand side API key trigger buttons.

2. **Inline Settings in Profile (`ProfileForm.tsx` or new `SettingsForm.tsx`)**:
   - Embed OpenAI API Key and Apify API Token management inside the Profile tab view.
   - Use client-side storage helpers (`getStoredApiKey`, `setStoredApiKey`, `clearStoredApiKey`, `getStoredApifyToken`, `setStoredApifyToken`, `clearStoredApifyToken`).
   - Provide visibility toggle (mask/unmask), save, and clear actions inline.

3. **Standalone `AppliedBoard.tsx`**:
   - Dedicated component for rendering `appliedMatches`.
   - Displays applied job cards with company, role, match score, pros, gaps, and external link.
   - Provides option to remove a job from applied status if desired.
   - Removed applied listings section from `MatchesBoard.tsx` to prevent duplication.

4. **Programmatic Key Modal Prompt (`ApiKeyModal.tsx`)**:
   - Streamlined into a simple prompt modal asking for the OpenAI API Key when scan is initiated without one.
   - Dismissible upon saving valid key or clicking close.

## Risks / Trade-offs

- [Risk] User attempts to scan without setting an OpenAI key in Profile settings.
  → *Mitigation*: Programmatic `ApiKeyModal` prompt pops up automatically to let them enter the key right away without forcing manually navigating to Profile.
