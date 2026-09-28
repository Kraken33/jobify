# Design: Apify JustJoin.it Scraper with Client BYOK Token

## Context

See `proposal.md` for background and motivation. JustJoin's public endpoint (`https://api.justjoin.it/v2/user-panel/offers`) is blocked by Cloudflare Bot Management (`HTTP 503`), rendering server-side direct fetches ineffective. To bypass Cloudflare and obtain live listings, the application will invoke the Apify actor `trev0n/justjoinit-scraper` synchronously.

The existing codebase adopts a strict Bring-Your-Own-Key (BYOK) paradigm for OpenAI: keys are held in browser `localStorage`, presented to the API route via headers, never persisted in Supabase or server logs, and accompanied by deterministic fallbacks when keys are absent. This design mirrors that exact architecture for the Apify API token.

## Goals / Non-Goals

**Goals:**
- Provide reliable ingestion of real JustJoin.it listings via Apify actor `trev0n/justjoinit-scraper`.
- Implement client-side BYOK token management for Apify (`jobify_apify_api_token`) with localStorage persistence, masking, and validation.
- Provide seamless request piping via `X-Apify-Token` header from UI through `/api/match` to `JustJoinProvider`.
- Map the actor's output items cleanly into the unified `JobListing` domain model.
- Retain deterministic multi-page fallback for users without an Apify token or when Apify quota/requests fail.

**Non-Goals:**
- Storing Apify API tokens in the PostgreSQL/Supabase database.
- Server-side background queue polling (Apify actor synchronous run-and-wait endpoint provides instant dataset items for fast single-page scans).
- Scraping non-JustJoin portals in this iteration.

## Decisions

### 1. Direct synchronous execution endpoint (`run-sync-get-dataset-items`)
**Decision:** Call Apify's synchronous execution endpoint:
`POST https://api.apify.com/v2/acts/trev0n~justjoinit-scraper/run-sync-get-dataset-items?token=<TOKEN>`
with a short timeout (e.g. 30-45 seconds) and `maxItems` constrained to the requested scan limit (e.g. 25).

**Rationale:** The scraper uses an HTTP-based fast scraper rather than a heavy headless browser for listing extraction, running in seconds. `run-sync-get-dataset-items` immediately yields the dataset JSON array without requiring webhook setups, polling loops, or dedicated client SDK background daemons in Next.js serverless route handlers.

**Alternatives considered:**
- *Apify Client SDK with polling (`client.actor(...).call(...)`)*: Adds dependency overhead and extra roundtrips compared to native fetch on the direct Apify REST API.
- *Asynchronous Webhook Callback*: Requires a public webhook receiver URL, complicating local dev and guest sessions.

### 2. Client BYOK Token Storage & Header Protocol
**Decision:** Store Apify token in `localStorage` under key `jobify_apify_api_token`. Pass it in scan requests under the `X-Apify-Token` HTTP header.

**Rationale:** Keeps the application server stateless and free of third-party API billing responsibilities. Directly parallels how `X-OpenAI-Key` is transmitted and handled in `apiKeyStorage.ts` and `src/app/page.tsx`.

**Alternatives considered:**
- *Server-side environment variable only (`APIFY_API_TOKEN`)*: Requires the app host to fund all users' scraping requests, incurring ongoing costs and rate-limit contention across users.

### 3. Unified API Key Management Modal
**Decision:** Update `ApiKeyModal` into a multi-key or tabbed/sectioned modal providing inputs for both OpenAI API Key and Apify API Token. Update `Navbar` indicators to show whether keys are configured.

**Rationale:** Candidates configure their third-party credentials in one cohesive settings dialog rather than scattering configuration across multiple UI panels.

### 4. Apify Output Schema Mapping
**Decision:** Standardize mapping from `trev0n/justjoinit-scraper` fields to `JobListing`:
- `id`: `raw.id` or slug parsed from `raw.jobUrl` or `raw.url` (prefixed with `justjoin_`)
- `title`: `raw.jobTitle` || `raw.title`
- `company`: `raw.company` || `raw.companyName`
- `url`: `raw.jobUrl` || `raw.url`
- `publishedAt`: `raw.published` || `raw.publishedAt` || ISO string
- `requiredSkills`: Array of strings extracted from `raw.requiredSkills` / `raw.skills`
- `workplaceType`: 'remote' | 'hybrid' | 'office' based on `raw.workplace`
- `seniority`: 'junior' | 'mid' | 'senior' | 'lead' parsed from `raw.experience`
- `salaryRange`: Parsed from `raw.salary` object (min, max, currency, type)
- `description`: `raw.description` (or fallback summary)

**Rationale:** Ensures downstream pre-filtering, LLM match evaluation, and UI display operate transparently without needing special-case provider logic.

## Risks / Trade-offs

- **[Apify Compute / Quota Limits]** → If a user has an invalid token or depleted compute units, Apify returns `401` or `402`. The provider catches this error, logs a notification, and degrades gracefully to the deterministic fallback generator so the user experience does not crash.
- **[Scraper Actor Latency]** → Scraping up to 25 items can take 5-15 seconds. Mitigated by setting `extractFullDetails: false` (fast overview scrape) and specifying `maxItems` equal to `criteria.limit`.
- **[Apify Token Format]** → Apify tokens usually start with `apify_api_`. The helper will validate format and display helpful guidance in the modal.

## Migration Plan

1. Non-breaking change: If no `X-Apify-Token` is supplied, `JustJoinProvider` seamlessly falls back to the deterministic multi-page sample generator as it already does.
2. Rollback strategy: Reverting the provider to ignore the Apify call or removing the header simply resumes the prior behavior with no database schema changes needed.
