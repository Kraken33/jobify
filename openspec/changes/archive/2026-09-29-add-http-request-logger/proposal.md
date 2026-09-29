# Proposal

## Why
When testing and running job search and matching, developers and operators need visibility into outbound HTTP requests sent to external providers (JustJoin via Apify, Bundesagentur für Arbeit, and Arbeitnow). Having a structured request logger and a dedicated in-app inspection route allows rapid diagnosis of API rate limits, provider payload issues, response times, and fallback trigger conditions without tailing raw server terminals.

## What Changes
- Add a structured HTTP logger utility with secret/token sanitization (masking API keys and Apify tokens in URLs and headers).
- Introduce an in-memory bounded ring buffer log store on the server runtime to hold recent outbound HTTP events.
- Instrument job provider adapters (JustJoin, Arbeitsagentur, Arbeitnow) to log outbound requests, latency, status codes, and error/fallback states.
- Expose an API endpoint `GET /api/logs` (and `DELETE /api/logs` to reset/clear buffer) for retrieving structured log entries.
- Create an in-app visual debug page at `/logs` to view, filter (by provider, status, search term), inspect JSON payloads, and monitor HTTP traffic in real time.

## Capabilities

### New Capabilities
- `http-request-logging`: In-memory capture, secret-redacted logging, API querying, and frontend visualization for outbound HTTP requests made by job providers and application services.

### Modified Capabilities
<!-- No changes to existing core matching/ingestion requirements -->

## Impact
- **Backend**: New modules in `src/lib/logger/` (`logger.ts`, `logStore.ts`, `sanitizer.ts`), new API route `src/app/api/logs/route.ts`, and updates to provider fetch helpers in `src/lib/providers/`.
- **Frontend**: New page `src/app/logs/page.tsx` and navigation/link affordance.
- **Dependencies**: None (uses native fetch, Next.js standard API routes and React UI).
