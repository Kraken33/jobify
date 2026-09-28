# Design: Bundesagentur für Arbeit Provider Integration

## Context

See `proposal.md` for background and motivation. Currently, Jobify supports JustJoin.it as its provider, requiring an Apify BYOK token to scrape live offers due to Cloudflare protection.

The Bundesagentur für Arbeit (Arbeitsagentur) maintains Germany's largest official job portal and exposes an open REST service at `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs`. This API is accessible without user registration or cost, requiring only the standard public client header `X-API-Key: jobboerse-jobsuche`. Because direct browser calls encounter CORS restrictions, the Next.js API route (`/api/match`) executes requests server-side in Node.js, where CORS does not apply.

## Goals / Non-Goals

**Goals:**
- Implement `ArbeitsagenturProvider` conforming to `IJobProvider` and register it in `providerRegistry`.
- Query `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs` with parameter mappings for keywords/skills (`was`), location (`wo`), and pagination.
- Map raw Arbeitsagentur listings (`stellenangebotsTitel`, `firma`, `stellenlokationen`, `gehaltsspanneVon/Bis`, `homeofficemoeglich`, `externeURL`, `referenznummer`, `aenderungsdatum`) to canonical `JobListing` domain models.
- Support date cursor filtering (`publishedAtCursor`) and deterministic multi-page fallback for resilience when offline.
- Enable users to choose between `justjoin` and `arbeitsagentur` when creating a search track in `CreateSessionModal`.
- Allow the scanning pipeline in `page.tsx` and `/api/match` to dynamically route to the session's designated provider.

**Non-Goals:**
- Building a browser userscript or extension (direct server-side REST API eliminates this need).
- Multi-region geo-radius geocoding beyond the standard `wo` location parameter.
- Scraping deep employer reviews or non-public internal agency databases.

## Decisions

### 1. Direct Server-Side REST vs. Browser Userscript
- **Decision:** Query `rest.arbeitsagentur.de` via standard Node.js `fetch` in `ArbeitsagenturProvider` from the server.
- **Rationale:** Tested and verified live from localhost Node.js. It returns HTTP 200 with complete JSON data without captcha or bot blocks. Eliminates the high friction and DOM brittleness of a Tampermonkey script.
- **Alternatives Considered:** Tampermonkey userscript + cross-tab message bridge (excessive user friction, fragile DOM parsing).

### 2. Provider Identifier and Domain Model Union
- **Decision:** Add `'arbeitsagentur'` to `JobListing.provider` in `src/types/index.ts`. Provider ID is `'arbeitsagentur'`.
- **Rationale:** Fits cleanly into the existing provider architecture without breaking any JustJoin or database schemas.

### 3. Normalization Mapping
- **Decision:** Map Arbeitsagentur fields as follows:
  - `id`: `arbeitsagentur_${referenznummer}`
  - `title`: `stellenangebotsTitel` || `hauptberuf`
  - `company`: `firma` || 'Unbekannt'
  - `city`: `stellenlokationen[0]?.adresse?.ort`
  - `isRemote`: `Boolean(homeofficemoeglich)`
  - `workplaceType`: `homeofficemoeglich ? (homeofficetyp === 'NACH_VEREINBARUNG' ? 'hybrid' : 'remote') : 'office'`
  - `salaryRange`: `{ min: gehaltsspanneVon, max: gehaltsspanneBis, currency: 'EUR', type: verguetungsangabe?.toLowerCase() }`
  - `url`: `externeURL` || `https://www.arbeitsagentur.de/jobsuche/jobdetail/${referenznummer}`
  - `publishedAt`: `aenderungsdatum` || `datumErsteVeroeffentlichung` || `veroeffentlichungszeitraum?.von`
  - `description`: Constructed from title, company, location, and contract duration.
- **Rationale:** Ensures all downstream matching and filtering algorithms receive expected fields.

### 4. Dynamic Provider Routing in UI & `/api/match`
- **Decision:** In `CreateSessionModal.tsx`, add a Provider selection dropdown with options:
  - `JustJoin.it (Tech / Global)`
  - `Bundesagentur für Arbeit (Germany / DACH)`
- In `src/app/page.tsx`, pass `providerId: currentSession.provider || 'justjoin'` to `/api/match`.
- **Rationale:** Previously, `/api/match` defaulted or hardcoded `providerId: 'justjoin'`. Now sessions will truly scan their respective provider.

### 5. Broadening Unresolvable Locations Instead of Reporting an Empty Scan
- **Decision:** When a search that carries a resolvable `wo` returns no posting usable for the request, `ArbeitsagenturProvider` retries exactly once without `wo` and attaches a `notice` stating that the location filter was skipped. The usability check reads the raw response page and never the cursor-filtered listings, and a home-office query counts as unusable when the page holds no `homeofficemoeglich` posting.
- **Rationale:** The board lists only jobs located in Germany, so a location outside its market (`Warsaw`, `Poland`, `Krakow`) is answered with an HTTP 200 and an empty or near-empty `ergebnisliste`. A 200 is a transport success, so no fallback fired and `/api/match` reported the misleading "no new jobs met your baseline constraints" message — dead-ending the first scan of every track whose location sits outside the German market. `wo=Warsaw` illustrates the second shape of the same problem: the service answers a `homeofficemoeglich=true` query with a single on-site posting, which the remote hard constraint then rejects. Widening once keeps the scan productive, while the `notice` keeps the relaxation visible in the scan feedback instead of silently ignoring the location.
- **Alternatives Considered:** Geolocating the location to decide whether to send `wo` (requires a geocoder and is out of scope); always sending `wo` and only rewording the message (leaves non-German tracks permanently empty); widening whenever the page is smaller than `size` (would silently override a deliberate German city search); widening on constraint failure in `/api/match` (duplicates provider-specific query knowledge in the route and would change JustJoin behaviour too).

## Risks / Trade-offs

- [Risk] Arbeitsagentur rate limiting if users scan repeatedly.
  - Mitigation: Cache checkpoints and keep batch size bounded (`size: limit` up to 25).
- [Risk] Some listings lack external URLs or salary information.
  - Mitigation: Fallback URL generated to standard Arbeitsagentur detail portal URL (`https://www.arbeitsagentur.de/jobsuche/jobdetail/...`); salary range left undefined if not provided.
- [Risk] Network unavailability or API downtime.
  - Mitigation: Deterministic multi-page fallback pool seeded by page offset, matching JustJoin's graceful degradation pattern.
- [Risk] Broadening drops the location the user asked for.
  - Mitigation: Bounded to a single retry, applied only when the located page holds nothing usable, and always surfaced through `ProviderResult.notice` in the scan feedback so the relaxation is never silent.

## Migration Plan

1. Non-breaking: Existing sessions and checkpoints continue using `'justjoin'`.
2. New search sessions can choose `'arbeitsagentur'`.
3. Rollback: If needed, the provider registry simply unregisters `ArbeitsagenturProvider` or UI hides the provider selector option.
