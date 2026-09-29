# Design

## Context

Arbeitnow search pages embed pagination metadata directly within a script variable `let data = { ... };` inside the HTML output. The frontend DOM text does not render static count strings (e.g. `212 Jobs`), but instead relies on Alpine.js to render page text (e.g. `Showing 1 of 12 pages`). Jobify's `ArbeitnowProvider.parseTotalCountFromHtml` previously relied on DOM regexes, which inadvertently captured `12` (the page count) as the total vacancy count.

See `proposal.md` for motivation and background.

## Goals / Non-Goals

**Goals:**
- Reliably extract the true total vacancy count (`data.total` or `data.last_page * data.per_page`) from Arbeitnow HTML search pages via `parseTotalCountFromHtml`.
- Prevent page counts (e.g. `Showing 1 of 12 pages`) from being matched as total job vacancy numbers.
- Maintain fallback support for standard REST API envelope querying (`fetchApiPage`) and deterministic fallback pools.

**Non-Goals:**
- Changing the web search scraping structure for job card parsing (`parseWebSearchHtml`).
- Modifying session storage schema or API contracts in `/api/session/count`.

## Decisions

### Decision 1: Primary extraction from embedded JavaScript `let data = {...}` script block
We will update `parseTotalCountFromHtml` to first search the HTML payload for the embedded JavaScript initialization script containing `let data = { ... };`.

```typescript
const dataMatch = html.match(/let\s+data\s*=\s*(\{[\s\S]*?\});\s*(?:current_page|let|\(\(\))/);
if (dataMatch) {
  try {
    const data = JSON.parse(dataMatch[1]);
    if (typeof data.total === 'number') {
      return data.total;
    }
    if (typeof data.last_page === 'number' && typeof data.per_page === 'number') {
      return data.last_page * data.per_page;
    }
  } catch {
    // Ignore JSON syntax errors and fall through
  }
}
```

**Alternatives Considered**:
- *Relying only on DOM regexes*: Fragile because client-rendered Alpine templates omit total job counts in plain DOM text.
- *Always querying the REST API*: The REST API returns global site totals rather than search-filtered totals for specific role and language tag criteria.

### Decision 2: Guarding secondary DOM regexes against matching page numbers
If the script block is absent, fall back to DOM regexes but update patterns so that page indicators like `Showing 1 of 12 pages` are ignored or explicitly guarded against matching:
```typescript
const pageMatch = html.match(/Showing\s+(?:page\s+)?\d+\s+of\s+\d+\s+pages/i);
// Avoid matching 'pages' as vacancy totals
```

## Risks / Trade-offs

- **[Risk]**: Arbeitnow changes the variable name `let data =` in their script block.
  - *Mitigation*: Fall back gracefully to `last_page` / `per_page` regexes, DOM regexes, or the REST API `fetchApiPage` envelope.

- **[Risk]**: Malformed JSON inside script block.
  - *Mitigation*: Wrap `JSON.parse` in a `try/catch` block so failures fall back safely without crashing.
