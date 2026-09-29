# Proposal

## Why

Currently, Jobify attempts a hybrid storage strategy where entities (candidate profile, search tracks/sessions, match results, applied vacancies, and scan pagination checkpoints) are written to both Supabase and `localStorage` with inconsistent error handling and missing schema columns in Supabase. On page reload, discrepancies in `profile_id` linkage, missing database fields (e.g. `target_role`, `spoken_languages`, `provider_options` on `search_sessions` and `status` on `job_matches`), and fallback logic cause newly created search tracks and match statuses to disappear or reset to implicit defaults. Migrating all core application data to Supabase as the single authoritative persistent store removes dual-source conflicts and guarantees search track and application state persistence across reloads.

## What Changes

- **Supabase Migration**:
  - Add missing columns to `search_sessions`: `target_role` (text), `spoken_languages` (jsonb default `'[]'`), and `provider_options` (jsonb default `'{}'`).
  - Add vacancy status column to `job_matches`: `status` (text with check constraint `'active' | 'applied' | 'dismissed'` default `'active'`).
  - Add indexes on `job_matches(status)` and `job_matches(profile_id, status)` for fast retrieval.
- **Remove `localStorage` from Application Storage Modules**:
  - `src/lib/storage/sessionStorage.ts`: Persist, query, and delete search sessions purely through Supabase `search_sessions`. Ensure `createImplicitSession` saves reliably to Supabase.
  - `src/lib/storage/profileStorage.ts`: Persist and fetch candidate profiles purely through Supabase `profiles`.
  - `src/lib/storage/matchStorage.ts`: Store and retrieve session matches and applied vacancies purely through Supabase `job_matches` filtered by `session_id` and `status`. Remove `jobify:matches:*` and `jobify:applied` localStorage keys.
  - `src/lib/storage/checkpointStorage.ts`: Query, upsert, and delete provider pagination cursors purely through Supabase `scan_checkpoints`.
- **Preserve Client Browser Storage for Secrets**:
  - `src/lib/storage/apiKeyStorage.ts` will continue using browser storage for user-provided OpenAI API keys and Apify tokens for user privacy and security.
- **Client Hydration Reliability**:
  - Refactor `src/app/page.tsx` mounting logic to sequentially ensure an active profile exists in Supabase, load all linked search tracks, maintain the active track selection, and hydrate match and applied lists without creating redundant or overwriting implicit sessions on reload.

## Capabilities

### Modified Capabilities
- `search-sessions`: Persist search sessions and provider options purely through Supabase `search_sessions` without localStorage fallbacks.
- `vacancy-status-management`: Persist vacancy status (`active`, `applied`, `dismissed`) in Supabase `job_matches` instead of `localStorage` key `jobify:applied`.

## Impact

- **Affected Code**: `src/lib/storage/sessionStorage.ts`, `src/lib/storage/profileStorage.ts`, `src/lib/storage/matchStorage.ts`, `src/lib/storage/checkpointStorage.ts`, `src/app/page.tsx`, `src/components/CreateSessionModal.tsx`, `supabase/migrations/`.
- **Database Schema**: New migration for `search_sessions` and `job_matches` tables.
- **Dependencies & Environment**: Supabase remains the primary backend data store. No new third-party dependencies required.
