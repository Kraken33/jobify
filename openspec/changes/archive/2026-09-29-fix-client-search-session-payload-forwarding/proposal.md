# Proposal

## Why

When creating or selecting a search track (e.g. for Arbeitnow with "Javascript" target role and "English only" tag), the created session is stored on the client in `localStorage` (and optionally in Supabase when configured). However, client-side requests from `page.tsx` and `MatchesBoard.tsx` to `/api/match` and `/api/session/count` only pass `sessionId`, `profile`, and `providerId`.

In server environments without Supabase configured (such as guest mode or local storage runtime), the server cannot read browser `localStorage` and fails to find the session record by ID. It then falls back to `createImplicitSession(profile)`, overwriting the session's `targetRole` with the candidate profile's default role ("Full Stack Developer") and losing `providerOptions` (such as `{ arbeitnow: { endpoint: "english-speaking-jobs" } }`). This causes provider queries to target `https://www.arbeitnow.com?search=Full-stack...` instead of the session's configured target role and endpoint tags.

## What Changes

- **Forward Active Session in Client Requests**:
  - Update `src/app/page.tsx` to pass the active `session: currentSession` object in the payload body when calling `/api/match`.
  - Update `src/components/MatchesBoard.tsx` to pass `session: activeSession` in the payload body when calling `/api/session/count`.
- **Honor Client-Provided Session in Backend Endpoints**:
  - Update `src/app/api/match/route.ts` to accept optional `session?: SearchSession` in the request body, using it directly when provided before falling back to server-side session lookup or implicit session creation.
  - Update `src/app/api/session/count/route.ts` to accept optional `session?: SearchSession` in the request body, using it directly when provided before falling back to server-side session lookup or implicit session creation.
- **Ensure Accurate Provider Queries**:
  - Guarantee that `session.targetRole`, `session.providerOptions`, `session.spokenLanguages`, `session.skills`, and provider parameters are preserved and forwarded to provider search adapters regardless of backend database availability.

## Capabilities

### Modified Capabilities
- `search-sessions`: Search session execution and vacancy count endpoints accept and respect client-provided session payloads so custom parameters (target role, provider options, languages) are accurately queried in both database-backed and local guest modes.
- `job-matching-engine`: Session-scoped scan requests receive and utilize the active search session payload to prevent fallback to candidate profile defaults.

## Impact
- **Affected Code**:
  - `src/app/page.tsx`: Passes `session` in `/api/match` POST payload.
  - `src/components/MatchesBoard.tsx`: Passes `session` in `/api/session/count` POST payload.
  - `src/app/api/match/route.ts`: Extracts `body.session` and prioritizes it for search and matching criteria.
  - `src/app/api/session/count/route.ts`: Extracts `body.session` and prioritizes it for provider vacancy count criteria.
- **APIs**: Backwards-compatible addition of optional `session` object to POST `/api/match` and POST `/api/session/count`.
