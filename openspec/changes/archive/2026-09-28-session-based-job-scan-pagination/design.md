# Design

## Context

See `proposal.md` → Why for motivation.

The existing codebase has these constraints relevant to approach:

- **`IJobProvider.searchJobs(criteria: SearchCriteria): Promise<JobListing[]>`** — the current return type is a plain array. All callers (`/api/match/route.ts`) rely on this; changing the shape is a breaking update that must be handled atomically.
- **`SearchCriteria`** has no cursor fields today; `JustJoinProvider` hardcodes `page=1`.
- **Supabase is optional** — `isSupabaseConfigured` guards all DB calls. The checkpoint design must degrade gracefully to `localStorage`.
- **No auth layer** — `profile.id` is an optional UUID. Sessions cannot rely on a user identity guarantee; they must work with or without a Supabase profile ID.
- **Next.js App Router** — route handlers are stateless; no in-process session state. All session/checkpoint state must be externalised.
- **`job_matches` rows** currently have no `session_id`. Adding this column as `NOT NULL` would break existing rows; it must be nullable.

---

## Goals / Non-Goals

**Goals:**
- Provider adapters return a `ProviderResult` envelope with `nextCursor` alongside listings.
- `SearchSession` entity (TypeScript type + Supabase table + localStorage fallback) stores search params, provider fingerprint, `publishedAtCursor`, and `seenJobIds`.
- `/api/match` reads and writes the session checkpoint on each scan, passing cursor to the provider and filtering seen IDs before AI evaluation.
- `MatchesBoard` gains a session switcher (dropdown) and "Scan Next Batch" / "Reset" controls per session.
- All state degrades to `localStorage` when Supabase is absent.

**Non-Goals:**
- Saved-Searches UI (session create/edit/delete forms) — a future feature; the implicit default session is sufficient for MVP.
- Cross-device sync without Supabase — out of scope.
- Re-scoring existing matches when LLM-only fields change — matches keep their original scores; only new listings in subsequent scans use updated profile context.
- ASC (oldest-first) scan direction — deferred; DESC (newest-first) cursor covers the primary use case.
- Support for additional providers beyond JustJoin — the cursor contract is generic but only JustJoin is implemented.

---

## Decisions

### 1. `ProviderResult` envelope instead of raw `JobListing[]`

**Decision:** `searchJobs` returns `{ listings: JobListing[], nextCursor: ProviderCursor | null, fallback?: boolean }`.

**Rationale:** The cursor must travel alongside the listings. Returning it out-of-band (e.g. via a separate method or stored state inside the provider class) would make providers stateful and hard to test. An envelope keeps the interface pure and composable.

**Alternative considered:** Keep `searchJobs` returning `JobListing[]` and add a separate `getCursor()` method on providers. Rejected — stateful provider objects complicate parallelism and testing.

### 2. `publishedAt`-based cursor, not page offset

**Decision:** Cursor = `{ publishedAtCursor: string | null }` (ISO timestamp of newest fetched job).

**Rationale:** Page offsets break when new listings are inserted between scans — page 2 shifts. Timestamp cursors are stable: "give me anything newer than X" is unaffected by insertions behind X. The JustJoin API sorts by `published_at DESC`, so date filtering maps cleanly.

**Alternative considered:** Opaque page-number cursor. Rejected — fragile under live data; fallback generator can't deterministically regenerate the same pool.

**Limitation acknowledged:** If two jobs share the exact same `published_at` millisecond at a page boundary, one could be skipped. The `seenJobIds` dedup layer provides a safety net; this edge case is acceptable.

### 3. Provider fingerprint = hash of provider-query params only

**Decision:**
```typescript
providerFingerprint = stableHash({
  skills:   [...session.skills].sort(),
  seniority: session.seniority,
  workMode:  session.workMode,
  location:  session.preferredLocation ?? '',
});
```
Only these four fields participate in the fingerprint. `targetRole`, `experienceSummary`, `minSalary` do NOT.

**Rationale:** `targetRole` and `experienceSummary` are never sent to the JustJoin API — they only feed the LLM prompt. `minSalary` is applied as a post-fetch filter. Resetting the cursor when they change would throw away perfectly valid pagination state for no gain.

**Implementation:** Use a deterministic JSON serialisation + `crypto.subtle.digest` (Web Crypto, available in Next.js edge/Node runtime) or a simple djb2 string hash for fast synchronous computation. The hash only needs stability within a session, not across machines.

### 4. One checkpoint row per (profile_id, provider_id) — no per-fingerprint rows

**Decision:** `scan_checkpoints` is keyed by `(profile_id, provider_id)` with the current fingerprint stored as a column. When fingerprint changes, the same row is overwritten.

**Rationale:** Multiple concurrent fingerprints per provider would require a session-switcher UI to be useful (otherwise which row do you resume?). Storing one row keeps the schema simple and defers that UX complexity. The fingerprint column still allows detecting staleness on load.

**Alternative considered:** Key by `(profile_id, provider_id, fingerprint)` — enables silent multi-context history. Rejected for this change; it implies the "Saved Searches" UI scope expansion we explicitly excluded.

### 5. Implicit default session bootstrapped from profile

**Decision:** If no `SearchSession` exists when a scan is triggered, the API creates an in-memory implicit session from `profile.skills`, `profile.seniority`, `profile.workMode`. This session is not persisted as a `search_sessions` row unless Supabase is configured.

**Rationale:** Preserves backward compatibility — existing users who haven't adopted the sessions concept still get the new cursor behaviour transparently. When Supabase is available, the implicit session becomes a real row on first scan.

### 6. `localStorage` key scheme for guest mode

```
jobify:checkpoint:{providerId}:{profileFingerprint}
jobify:sessions:{profileId}
```

Scoped by provider and fingerprint so that profile changes don't surface stale cursors. Serialised as JSON; no encryption (no sensitive data).

### 7. `session_id` on `job_matches` is nullable

**Decision:** `ALTER TABLE job_matches ADD COLUMN session_id uuid REFERENCES search_sessions(id) ON DELETE SET NULL;`

**Rationale:** Existing rows have no session. A `NOT NULL` constraint would require a backfill migration that is unsafe without knowing which session each historical row belongs to. `NULL` session_id rows are treated as belonging to the legacy implicit session in the UI.

---

## Data Model

### New TypeScript types (`src/types/index.ts`)

```typescript
export interface ProviderCursor {
  publishedAtCursor: string | null;  // ISO timestamp
}

export interface ProviderResult {
  listings: JobListing[];
  nextCursor: ProviderCursor;
  fallback?: boolean;
}

export interface SearchSession {
  id: string;
  profileId?: string;
  name: string;
  providerId: string;
  skills: string[];
  seniority: SeniorityLevel;
  workMode: WorkMode;
  preferredLocation?: string;
  createdAt: string;
}

export interface ScanCheckpoint {
  sessionId: string;
  providerId: string;
  providerFingerprint: string;
  publishedAtCursor: string | null;
  seenJobIds: string[];
  lastScanAt: string | null;
}
```

### New Supabase tables

```sql
-- search_sessions
create table if not exists public.search_sessions (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid references public.profiles(id) on delete cascade,
  name         text not null,
  provider_id  text not null default 'justjoin',
  skills       text[] not null default '{}',
  seniority    text not null,
  work_mode    text not null,
  location     text,
  created_at   timestamptz default now() not null
);

-- scan_checkpoints (one row per session+provider)
create table if not exists public.scan_checkpoints (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid references public.search_sessions(id) on delete cascade,
  provider_id           text not null,
  provider_fingerprint  text not null,
  published_at_cursor   timestamptz,
  seen_job_ids          text[] default '{}',
  last_scan_at          timestamptz,
  unique (session_id, provider_id)
);

-- extend job_matches
alter table public.job_matches
  add column if not exists session_id uuid references public.search_sessions(id) on delete set null;
```

---

## API Contract Changes

### `POST /api/match` — extended request body

```typescript
{
  profile: CandidateProfile,
  providerId: string,           // default: 'justjoin'
  sessionId?: string,           // omit → implicit session from profile
  limit?: number,
}
```

### `POST /api/match` — extended response

```typescript
{
  matches: MatchResult[],
  totalFetched: number,
  totalEligible: number,
  nextCursor: ProviderCursor,   // NEW: client stores this for next scan
  totalSeen: number,            // NEW: size of seenJobIds after this scan
  sessionId: string,            // NEW: echoed back for client to persist
  message?: string,
}
```

---

## Component Architecture

### `MatchesBoard` changes

- Receives `sessions: SearchSession[]`, `activeSessionId: string`, `onSessionChange`, `onResetSession` props.
- Renders a session dropdown (or single implicit session label if only one exists).
- "Scan Next Batch" button replaces "Scan JustJoin.it Now" — disabled when `isLoading` or `hasMore === false`.
- "Reset Session" button clears `matches` and sends a reset scan (no cursor) for the active session.

### `page.tsx` state additions

```typescript
const [sessions, setSessions] = useState<SearchSession[]>([]);
const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
const [cursors, setCursors] = useState<Record<string, ProviderCursor>>({});
```

On each successful scan response, `cursors[sessionId]` is updated with `nextCursor` from the response.

---

## Multi-page Fallback Generator

When the JustJoin API is unavailable, `getSampleFallbackListings(criteria, page)` seeds a pseudo-random generator with `page` to produce a deterministically different pool per page call. Uses a fixed set of ~20 template offers with shuffled/permuted titles, companies, and salary ranges based on the seed.

---

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| JustJoin API doesn't support `publishedAt` date filters in its query params | Apply date filter in application layer after fetch; fetch a larger page size to compensate for filtered-out old items |
| `seenJobIds` array grows large over time | Cap at 500 most-recent IDs (ring buffer); oldest entries pruned on checkpoint write |
| Implicit session creates a checkpoint row without a real `session_id` in guest mode | Use a stable localStorage-derived UUID seeded from the profile's content hash as the session ID; consistent within the browser |
| Nullable `session_id` on `job_matches` means old rows show up in "all sessions" view | UI filters by `session_id IS NOT NULL`; legacy rows shown in a collapsed "Legacy Matches" section or hidden by default |
| Provider fingerprint hash collisions | Theoretical only at this scale; SHA-1 or djb2 over the 4-field tuple is sufficient |

---

## Migration Plan

1. Deploy new Supabase migration (`search_sessions`, `scan_checkpoints`, `session_id` on `job_matches`).
2. No data backfill required — existing `job_matches` rows keep `session_id = NULL`.
3. On first scan after deploy, an implicit session is created transparently; the user sees no difference in UX except the cursor state is now preserved.
4. **Rollback:** Remove `session_id` column from `job_matches`, drop `scan_checkpoints` and `search_sessions` tables. The `/api/match` endpoint falls back to the pre-change behaviour if `sessionId` is absent and checkpoints table doesn't exist (all DB calls are try/catch guarded).
