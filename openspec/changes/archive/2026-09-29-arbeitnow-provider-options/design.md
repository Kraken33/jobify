# Design

## Context

The Arbeitnow website exposes several pre-filtered URL paths (e.g. `/english-speaking-jobs`, `/visa-sponsorship-jobs`) that act as server-side curated job collections. These are distinct from the generic root endpoint and cannot be replicated by adding query parameters alone. The current provider always hits `https://www.arbeitnow.com/?search=...`, so English-only and visa-sponsored filtering relies on HTML tag heuristics that are inconsistent. Additionally, for maximum precision, named endpoint paths must be paired with their corresponding `tags` query parameter: `english-speaking-jobs` requires `tags=["english speaking"]`, and `visa-sponsorship-jobs` requires `tags=["visa sponsorship"]`. Using the path without its implicit tag produces a broader, less accurate result set.

The `SearchSession` type holds per-session provider configuration but currently has no field for provider-specific options. The `SearchCriteria` type is the interface boundary between the session layer and the provider adapters — it flows from the API route into `provider.searchJobs()`.

## Goals / Non-Goals

**Goals:**
- Allow users to select an Arbeitnow endpoint mode (e.g. "English only") when creating a session
- Store the selection on the session as `providerOptions`
- Thread it through to `ArbeitnowProvider.buildSearchUrl()` via `SearchCriteria.providerHints`
- Show endpoint options as tag chips in `CreateSessionModal` only when Arbeitnow is selected

**Non-Goals:**
- Provider-specific options for JustJoin.it or Arbeitsagentur (future work)
- Multi-select endpoint modes (Arbeitnow endpoints are mutually exclusive paths)
- Persisting endpoint choices to Supabase beyond the session object

## Decisions

### 1. `providerOptions` on `SearchSession`, `providerHints` in `SearchCriteria`

**Decision:** Two separate fields — a generic `providerOptions` bag on the session for persistence, and a typed `providerHints` on criteria for the adapter contract.

**Rationale:** `SearchCriteria` is the stable interface every provider implements against. Making it slightly typed (`{ arbeitnow?: { endpoint?: string } }`) gives compile-time safety for the one adapter that uses it, without polluting the shared contract with a fully opaque bag. The session stores `providerOptions` as `Record<string, unknown>` since the session type doesn't need to know adapter internals.

**Alternative considered:** Adding `endpoint` directly to `SearchCriteria` as a top-level field. Rejected — it's Arbeitnow-specific and would appear as dead weight in every other provider's call.

### 2. Tag chip UI, single-select, default = no endpoint hint

**Decision:** Render clickable tag chips (not a dropdown) when provider is `arbeitnow`. Only one chip active at a time. No chip selected = generic endpoint.

**Rationale:** Chips match the explore session UX design and keep the UI scannable. Single-select maps cleanly to the one-path-per-URL constraint of the Arbeitnow site. Making "none" a valid default ensures backward compatibility with existing sessions that have no `providerOptions`.

### 3. API route threads `session.providerOptions` → `criteria.providerHints`

**Decision:** In `route.ts`, cast `session.providerOptions` to the Arbeitnow shape and pass it as `providerHints` when calling `provider.searchJobs()`.

**Rationale:** The route is the only place that has both the full session and builds the criteria object. No other layer needs to know about the mapping.

### 4. Endpoint modes inject their implicit tags into the query

**Decision:** `buildSearchUrl()` maintains a static map of endpoint path → implicit tag (`english-speaking-jobs` → `"english speaking"`, `visa-sponsorship-jobs` → `"visa sponsorship"`). When an endpoint hint is active and has an associated tag, that tag is merged into the `tags` array before URL serialization — even if the user did not explicitly add a spoken-language filter for it.

**Rationale:** Arbeitnow's own search UI always pairs the path with the tag (e.g. `english-speaking-jobs?search=...&tags=["english speaking"]`). Using only the path gives a broader, less precise result set. The implicit tag is additive and does not remove or override any user-supplied tags.

**Alternative considered:** Requiring users to also add English to their spoken languages to trigger the tag. Rejected — users who pick the "English only" chip should get precise results without needing to also configure spoken languages.

## Risks / Trade-offs

- **HTML scraping dependency**: The `/english-speaking-jobs` path is still scraped HTML, not a structured API. If Arbeitnow changes its HTML structure the endpoint switch helps but scraping still breaks. → Mitigation: existing fallback to REST API and fallback pool remains unchanged.
- **`providerOptions` is untyped on `SearchSession`**: Using `Record<string, unknown>` keeps the session type provider-agnostic but loses compile-time safety at the session level. → Acceptable: the route performs a typed cast, so the only unsafe boundary is explicit and localized.

## Migration Plan

No database migrations required. `providerOptions` is stored only on `SearchSession` objects in the client-side / Supabase session store. Existing sessions without `providerOptions` will see `undefined`, which the provider gracefully treats as the generic endpoint.
