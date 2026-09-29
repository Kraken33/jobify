# HTTP Request Logging Specification

## Purpose
Provides structured logging, secret sanitization, in-memory buffering, API querying, and real-time visualization for outbound HTTP requests dispatched to external job boards and services.

## Requirements

### Requirement: Outbound HTTP Request Logging & Secret Sanitization
The system SHALL intercept and log outbound HTTP requests dispatched to job providers (such as JustJoin, Arbeitsagentur, and Arbeitnow). Log entries MUST capture the timestamp, provider identifier, HTTP method, target URL, request duration (in milliseconds), response HTTP status code, and error status or fallback flag. The logger MUST automatically sanitize sensitive tokens and credentials: any query parameters containing tokens (such as `token` or `apiKey`) and authentication headers (such as `X-API-Key`, `Authorization`, and `x-openai-key`) MUST be masked before persistence or output.

#### Scenario: Logging a successful provider HTTP request
- **WHEN** an outbound HTTP request is made to an external provider endpoint and succeeds with status 200
- **THEN** a structured log entry is recorded containing the provider ID, method, sanitized URL, response status 200, and elapsed duration in milliseconds

#### Scenario: Sanitizing secret query parameters in logged URLs
- **WHEN** an HTTP request is made with sensitive query parameters (e.g. `?token=secret123&other=val`)
- **THEN** the recorded URL in the log entry replaces the sensitive value with a masked indicator (e.g. `?token=***&other=val`)

#### Scenario: Logging failed provider requests and fallback state
- **WHEN** an HTTP request to an external provider times out or returns a non-200 error code
- **THEN** the log entry captures the error message, status code, duration, and sets `fallbackUsed: true` if fallback listings were returned

### Requirement: In-Memory Bounded Log Store & Query API
The system SHALL maintain an in-memory bounded ring buffer of recent HTTP log entries (up to a fixed capacity, e.g. 200 entries) on the server runtime. The system SHALL expose an HTTP API endpoint `GET /api/logs` that returns the recorded log entries sorted in reverse chronological order, supporting filtering by provider ID. The system SHALL support resetting or clearing the in-memory log buffer via `DELETE /api/logs`.

#### Scenario: Querying logs via API
- **WHEN** a client issues `GET /api/logs`
- **THEN** the server responds with a JSON array of recent log entries up to the buffer capacity, newest first

#### Scenario: Filtering logs by provider
- **WHEN** a client issues `GET /api/logs?provider=arbeitsagentur`
- **THEN** the server responds only with log entries where `providerId` matches `'arbeitsagentur'`

#### Scenario: Clearing log buffer
- **WHEN** a client issues `DELETE /api/logs`
- **THEN** the in-memory buffer is cleared and subsequent `GET /api/logs` returns an empty list

### Requirement: In-App Logs Dashboard Route
The system SHALL provide an interactive visual route at `/logs` within the application. The page SHALL render a live list of recorded HTTP requests with indicators for timestamp, provider, HTTP method, status code (with visual color-coded badges for success and errors), latency, and expandable request/response inspection panels. The page SHALL provide interactive controls to refresh the logs, filter by provider and error state, search by URL/term, and clear the log history.

#### Scenario: Viewing logs on /logs route
- **WHEN** a user navigates to `/logs`
- **THEN** the page displays the list of recent HTTP requests with color-coded status badges, duration in ms, and provider identifiers

#### Scenario: Inspecting request details
- **WHEN** a user expands an individual log row on the `/logs` page
- **THEN** the view reveals formatted details including the sanitized request URL, headers, payload summary, and error or response metadata
