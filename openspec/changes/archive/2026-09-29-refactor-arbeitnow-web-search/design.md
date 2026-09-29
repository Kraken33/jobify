# Design: Arbeitnow Web Search Scraping Adapter

## Context

See [proposal.md](file:///Users/vanluv/develop/jobifyv2/openspec/changes/refactor-arbeitnow-web-search/proposal.md) for background and motivation. `ArbeitnowProvider` currently fetches `https://www.arbeitnow.com/api/job-board-api?page=1`, which returns a fixed feed of ~325 newest posts regardless of search parameters. To provide relevant search results for tech candidates, `ArbeitnowProvider` will construct web search queries targeting `https://www.arbeitnow.com/?search=...` and parse the rendered HTML search results.

## Goals / Non-Goals

**Goals:**
- Serialize `SearchCriteria` (keywords, spoken language tags, page) into Arbeitnow search URL parameters (`search`, `tags`, `sort_by`, `page`).
- Parse web search HTML to extract job titles, company names, locations, tags, detail URLs, and job descriptions.
- Extract required spoken languages and CEFR levels from item tags and descriptions.
- Fall back gracefully to `/api/job-board-api` or `arbeitnowFallbackPool` when web search is unavailable.

**Non-Goals:**
- Building a full browser automation / Puppeteer pipeline (HTML parsing via fetch + regex/DOM parsing is sufficient since Arbeitnow server-renders search results).

## Decisions

### Decision 1: Query Serialization & Web Search URL Construction
- **Choice**: Construct `https://www.arbeitnow.com/?search={encodedKeywords}&tags={encodedTags}&sort_by=relevance&page={page}`.
- **Rationale**: Arbeitnow web search accepts `search` for keywords and a JSON-encoded string array for `tags` (e.g. `tags=["english speaking"]`).
- **Alternative Considered**: Querying API with `?search=...` (Rejected: as proven by diagnostic API tests, `/api/job-board-api` ignores all search query parameters).

### Decision 2: HTML Card Extraction Engine
- **Choice**: Parse job items by matching `data-job-item-link="true"` anchors and surrounding HTML container elements (`itemprop="url"`, `title`, company names, tags, locations).
- **Rationale**: Arbeitnow marks every job link with `data-job-item-link="true"` and microdata attributes, making HTML parsing reliable without heavy DOM parser dependencies.

### Decision 3: Fallback Strategy
- **Choice**: If web search request fails, times out, or returns an unparseable response, fall back to the public REST API (`/api/job-board-api`) or `arbeitnowFallbackPool`.
- **Rationale**: Ensures high resilience during offline testing or temporary network glitches.

## Risks / Trade-offs

- [Risk: Website HTML structure changes] → Mitigation: Retain fallback to `/api/job-board-api` and fallback pool, with clear warning logging if HTML card patterns fail to match.
