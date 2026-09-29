# Design

## Context
External job providers (`JustJoinProvider`, `ArbeitsagenturProvider`, and `ArbeitnowProvider`) perform server-side HTTP calls during match and vacancy ingestion runs. See `proposal.md` for motivation. Currently, errors and latency are difficult to inspect without checking terminal logs or inspecting raw error envelopes.

## Goals / Non-Goals

**Goals:**
- Provide a typed, centralized logging and sanitization utility for outbound HTTP calls.
- Maintain an in-memory bounded ring buffer (default 200 items) to prevent memory growth while keeping recent logs readily accessible.
- Expose an API route `GET /api/logs` and `DELETE /api/logs` to retrieve and clear captured entries.
- Build a responsive, dark-themed UI page at `/logs` with live inspection, status indicators, latency meters, search/filter, and expandable details.

**Non-Goals:**
- Heavy persistent database log indexing (Postgres / Supabase tables for all HTTP calls).
- Distributed tracing (e.g. OpenTelemetry exporter) beyond lightweight in-app diagnostics.
- Monkey-patching `globalThis.fetch` in production runtimes, which can introduce subtle Next.js edge runtime and instrumentation conflicts.

## Decisions

### 1. Dedicated `loggedFetch` Wrapper Utility vs Global Fetch Monkey-Patching
- **Decision**: Provide a `loggedFetch` helper in `src/lib/logger/loggedFetch.ts` and use it within provider adapters.
- **Rationale**: Explicit wrapping guarantees full control over request/response timing, status extraction, provider tags, and avoids intercepting unrelated Next.js internal / asset fetching.
- **Alternative considered**: Patching `globalThis.fetch`. Rejected because it intercepts telemetry, internal framework requests, and can conflict with Next.js caching layers.

### 2. In-Memory Ring Buffer (`logStore.ts`)
- **Decision**: Keep an in-memory singleton ring buffer (max 200 items) in `src/lib/logger/logStore.ts`.
- **Rationale**: Instant access, zero database latency, zero database migrations or storage costs, completely ephemeral across restarts which matches local dev and diagnostic inspection needs.
- **Alternative considered**: Storing logs in Supabase. Rejected as unnecessary overhead and potential storage bloat for high-frequency dev requests.

### 3. Secret & Credential Sanitization (`sanitizer.ts`)
- **Decision**: Run URLs and headers through a dedicated sanitizer before recording into log entries.
- **Rules**:
  - Mask known query params: `token`, `apiKey`, `key`, `secret`, `password`. E.g., `?token=abc12345` -> `?token=***`.
  - Mask sensitive headers: `X-API-Key`, `Authorization`, `x-openai-key`, `x-apify-token`. E.g., `Bearer ey...` -> `Bearer ***`.
  - Summarize or truncate large response/request bodies to avoid inflating buffer memory.

### 4. UI Dashboard at `/logs`
- **Decision**: Create `src/app/logs/page.tsx` with a modern developer-friendly UI matching Jobify's dark design theme.
- **Features**:
  - Auto-refresh toggle (e.g. poll every 3s) + manual refresh button.
  - Filter chips: All, JustJoin, Arbeitsagentur, Arbeitnow.
  - Filter by status: All, Success (2xx), Errors (4xx/5xx).
  - Search input for matching URL, status text, or error message.
  - Detail drawer/accordion for headers, request parameters, and response status.
  - Clear logs button (`DELETE /api/logs`).

## Risks / Trade-offs

- **[Multi-instance Serverless Runtimes]** → In-memory buffer is per-process. In local development or single-container deployments, logs will be continuous; in multi-worker environments, logs reflect the worker handling the request. Mitigated by keeping logs focused on local dev & staging debugging.
- **[Accidental Leak of New Auth Formats]** → Sanitizer checks both explicit known key names and regex patterns for tokens/keys in query strings and header keys.
