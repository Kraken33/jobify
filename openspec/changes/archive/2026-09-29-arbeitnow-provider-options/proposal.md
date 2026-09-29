# Proposal

## Why

The Arbeitnow job board exposes several pre-filtered endpoint paths (e.g. `/english-speaking-jobs`, `/visa-sponsorship-jobs`) that act as server-side curated collections, not achievable through search query parameters alone. Currently the provider always hits the generic root endpoint, so users who want English-only or visa-sponsored listings get an inconsistent mix from HTML tag-based heuristics instead of the authoritative filtered feed.

## What Changes

- Add `providerOptions?: Record<string, unknown>` to the `SearchSession` type so sessions can carry provider-specific configuration chosen at creation time.
- Add `providerHints?: { arbeitnow?: { endpoint?: string } }` to `SearchCriteria` so the match API route can thread session-level provider configuration into the provider call.
- Update `ArbeitnowProvider.buildSearchUrl()` to use `criteria.providerHints?.arbeitnow?.endpoint` as the URL path segment when present (e.g. `https://www.arbeitnow.com/english-speaking-jobs?search=...`).
- Update the match API route (`/api/match`) to map `session.providerOptions` → `criteria.providerHints` when calling `provider.searchJobs()`.
- Update `CreateSessionModal` to show clickable tag chips when the Arbeitnow provider is selected, letting the user choose one endpoint mode. The selected mode is stored on `session.providerOptions`.

## Capabilities

### New Capabilities

*(none — this is a configuration threading change, not a new top-level capability)*

### Modified Capabilities

- `job-provider-ingestion`: The Arbeitnow adapter's requirement for how it constructs web search URLs is extended: when `providerHints.arbeitnow.endpoint` is present in search criteria, the adapter SHALL use that value as the URL path segment instead of the generic root, enabling server-side endpoint filtering.

## Impact

- `src/types/index.ts`: Two interface extensions (`SearchSession`, `SearchCriteria`)
- `src/app/api/match/route.ts`: Thread `session.providerOptions` into `criteria.providerHints`
- `src/lib/providers/ArbeitnowProvider.ts`: `buildSearchUrl()` reads endpoint hint
- `src/components/CreateSessionModal.tsx`: Conditional tag chip UI for Arbeitnow
