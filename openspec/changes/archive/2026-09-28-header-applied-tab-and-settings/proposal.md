# Proposal

## Why

Currently, API key buttons (OpenAI key and Apify token) take up prime header navigation space, cluttering the UI and mixing global navigation with settings controls. Furthermore, applied job listings are nested inside the Matches board rather than being accessible as a first-class navigation view.

Relocating API key and token management into a dedicated "Settings" section within the Profile tab cleans up the header navigation, while promoting "Applied" to its own primary tab in the header improves visibility and workflow clarity for job applications.

## What Changes

- **Header Navigation**:
  - Remove OpenAI and Apify token status buttons from the top header navigation.
  - Add a dedicated **Applied** tab to the header alongside **Matches** and **Profile** (`'matches' | 'applied' | 'profile'`).
  - Add applied match count badge to the Applied tab button in the header.
- **Profile & Settings UI**:
  - Create a dedicated **API Keys & Settings** section inside the Profile view for managing OpenAI API key and Apify API token (inline save, view/mask, delete).
- **Applied View**:
  - Extract applied job listings into a dedicated `AppliedBoard` component displayed when the Applied tab is active.
- **Minimal Key Modal**:
  - Simplify `ApiKeyModal` into a lightweight, programmatic modal prompt shown *only* when a scan attempt is made without an OpenAI API key configured.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `candidate-profile`: Update UI requirements for key management (moving key/token settings into Profile view) and header navigation tab structure (adding Applied tab).
- `job-matching-engine`: Update key verification prompt behavior during scan execution to trigger a minimal prompt modal.

## Impact

- `src/components/Navbar.tsx`: Updated to display `Matches`, `Applied`, and `Profile` tabs; removed API key status buttons and `onOpenKeyModal` prop.
- `src/components/ProfileForm.tsx`: Extended to include an inline **API Keys & Settings** section for managing OpenAI key and Apify token.
- `src/components/AppliedBoard.tsx`: New component to render applied job listings cleanly.
- `src/components/ApiKeyModal.tsx`: Refactored to serve as a minimal prompt modal when scanning without an OpenAI key.
- `src/components/MatchesBoard.tsx`: Cleaned up to focus purely on active job matches (removing embedded applied section).
- `src/app/page.tsx`: Updated active tab state logic (`'matches' | 'applied' | 'profile'`) and navbar event handlers.
