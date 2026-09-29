# Design

## Context

See `proposal.md` for motivation and background.

Currently, `src/app/page.tsx` and `src/components/MatchesBoard.tsx` manage active `SearchSession` objects in React state and local storage. When invoking `/api/match` and `/api/session/count`, only `sessionId`, `profile`, and `providerId` were being transmitted in the JSON body.

In offline or local guest environments where Supabase is not configured, the server-side API routes attempt to query the database via `loadSessions(profile.id)`, find no sessions, and fall back to `createImplicitSession(profile)`. This fallback uses `profile.targetRole` and default provider configuration, discarding any custom `targetRole` (e.g. "Javascript") or `providerOptions` (e.g. `{ arbeitnow: { endpoint: "english-speaking-jobs" } }`) configured on the active session.

## Goals / Non-Goals

**Goals:**
- Pass the full active `SearchSession` object from `page.tsx` to `/api/match` and from `MatchesBoard.tsx` to `/api/session/count`.
- Update `/api/match` and `/api/session/count` to prioritize `body.session` when present before attempting server-side database lookup or creating an implicit fallback session.
- Ensure all session attributes (`targetRole`, `providerOptions`, `skills`, `seniority`, `workMode`, `location`, `spokenLanguages`) are consistently forwarded to provider adapter methods (`searchJobs` and `getJobCount`).

**Non-Goals:**
- Modifying the underlying schema or storage mechanisms of `localStorage` or Supabase.
- Changing provider scraping algorithms or external API response parsing.

## Decisions

### 1. Direct Session Payload Forwarding from Client

**Decision:** Include `session: currentSession` in the POST request body in `src/app/page.tsx`, and `session: activeSession` in `src/components/MatchesBoard.tsx`.

**Rationale:**
- In Next.js App Router, server route handlers have no direct access to browser `localStorage`.
- Passing the active session in the payload makes the scan and vacancy count operations completely resilient to database connectivity status and supports seamless guest/offline mode.

**Alternatives Considered:**
- *Rely only on server-side database synchronization:* Fails for guest users without Supabase credentials and introduces unnecessary network roundtrips.

### 2. Precedence Order in API Route Session Resolution

**Decision:** In `/api/match` and `/api/session/count`, resolve the session using the following hierarchy:
1. `body.session` if provided and valid
2. `loadSessions(profile.id)` lookup matching `sessionId` (if `body.session` not provided)
3. `createImplicitSession(profile)` fallback if no session could be resolved

**Rationale:**
- Full backward compatibility for any existing API consumers sending only `sessionId`.
- Direct resolution when `session` is supplied by the frontend client.

## Risks / Trade-offs

- **[Risk] Client-provided session might have missing or incomplete fields**
  → *Mitigation*: Both `/api/match` and `/api/session/count` already provide safe fallbacks (e.g., `session.targetRole || profile.targetRole`, `session.spokenLanguages || profile.spokenLanguages`, `session.skills || []`).
