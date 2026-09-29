# Design

## Context

Currently, the client app uses a hybrid storage layer where storage modules (`profileStorage`, `sessionStorage`, `matchStorage`, `checkpointStorage`) query Supabase, silently catch errors, and fall back to `localStorage`. Because the Supabase database tables (`search_sessions` and `job_matches`) were missing columns required by the client data structures (`target_role`, `spoken_languages`, `provider_options`, `status`), Supabase writes failed, causing state desynchronization and wiping search tracks on page reload.

## Goals / Non-Goals

**Goals:**
- Unify application persistence in Supabase Postgres as the single source of truth for profiles, search sessions, checkpoints, and match status tracking.
- Align Supabase table schemas with all frontend model requirements (`target_role`, `spoken_languages`, `provider_options` on `search_sessions`, and `status` on `job_matches`).
- Remove `localStorage` reads, writes, and fallbacks from `profileStorage`, `sessionStorage`, `matchStorage`, and `checkpointStorage`.
- Ensure clean lifecycle bootstrapping in `page.tsx` so that page reloads preserve all active search tracks and matches without resetting to implicit sessions.

**Non-Goals:**
- Moving API keys (OpenAI key / Apify token) to Supabase. They will remain securely in browser storage (`apiKeyStorage.ts`).
- Implementing multi-user authentication beyond the existing single-profile / demo user structure.

## Decisions

### 1. Database Schema Extension (Migration)
- **Decision**: Create a migration `20260929120000_unify_storage_schema.sql` that adds:
  - `ALTER TABLE public.search_sessions ADD COLUMN IF NOT EXISTS target_role text;`
  - `ALTER TABLE public.search_sessions ADD COLUMN IF NOT EXISTS spoken_languages jsonb DEFAULT '[]'::jsonb;`
  - `ALTER TABLE public.search_sessions ADD COLUMN IF NOT EXISTS provider_options jsonb DEFAULT '{}'::jsonb;`
  - `ALTER TABLE public.job_matches ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'applied', 'dismissed'));`
  - Indexes on `job_matches(status)` and `job_matches(session_id, status)`.
- **Alternatives Considered**: Storing arbitrary session fields in a generic JSON blob column vs explicit columns. Explicit typed columns (with JSONB for structured lists) provide better querying, typing, and safety.

### 2. Pure Supabase Storage Handlers
- **Decision**: Refactor all storage handlers in `src/lib/storage/`:
  - `profileStorage.ts`: `loadCandidateProfile()` queries `profiles` table. If empty, creates and saves the default profile into Supabase. `saveCandidateProfile()` updates or inserts the profile row in Supabase.
  - `sessionStorage.ts`: `loadSessions(profileId)` selects from `search_sessions` where `profile_id = profileId`. `saveSession(session)` upserts into `search_sessions`. `deleteSession(sessionId)` deletes from `search_sessions`.
  - `matchStorage.ts`: `loadSessionMatches(sessionId)` selects from `job_matches` where `session_id = sessionId` and `status != 'dismissed'`. `saveSessionMatches` updates/upserts `job_matches`. `loadAppliedMatches()` queries `job_matches` where `status = 'applied'`. `saveAppliedMatch(match)` updates `status = 'applied'` for that job in Supabase.
  - `checkpointStorage.ts`: `loadCheckpoint`, `saveCheckpoint`, `clearCheckpoint` operate directly on `scan_checkpoints`.
- **Alternatives Considered**: Keeping localStorage as an offline cache. Rejected because dual-source sync leads to cache invalidation and phantom state deletion on reload.

### 3. Client Bootstrapping & Hydration Flow in `page.tsx`
- **Decision**: Execute a clear, sequential hydration lifecycle in `page.tsx`:
  ```
  1. loadCandidateProfile() -> returns guaranteed Profile with `id` (creates in DB if none exists).
  2. loadSessions(profile.id) -> queries search_sessions for this profile.
  3. If loadedSessions is empty:
     -> createImplicitSession(profile), persist it to Supabase via saveSession, and set as active session.
     If loadedSessions has items:
     -> set active session to loadedSessions[0].id (or previously active session if valid).
  4. loadSessionMatches(activeSessionId) -> hydrates active matches.
  5. loadAppliedMatches() -> hydrates global applied matches list.
  ```

## Risks / Trade-offs

- **[Risk] Supabase credentials missing in development environment**:
  → *Mitigation*: Provide explicit, user-friendly warnings or error banners if `isSupabaseConfigured` is false or Supabase connection fails, rather than silently failing and losing data.
- **[Risk] Existing in-memory / localStorage data migration**:
  → *Mitigation*: During the first load, if a profile or session exists only in localStorage and not Supabase, automatically upsert it to Supabase once during hydration or initialize fresh from Supabase.
- **[Risk] Match status updates on applied/dismissed**:
  → *Mitigation*: Ensure `job_matches` rows have the `status` column indexed and queries for active matches filter out `status = 'dismissed'`.
