# Tasks

## 1. Supabase Database Schema Migration

- [x] 1.1 Create migration `supabase/migrations/20260929120000_unify_storage_schema.sql` adding `target_role`, `spoken_languages` (jsonb), and `provider_options` (jsonb) to `search_sessions`, adding `status` (`'active' | 'applied' | 'dismissed'`) to `job_matches`, and creating indexes on `job_matches(status)` and `job_matches(session_id, status)`. Verify SQL syntax and completeness.

## 2. Storage Modules Refactoring

- [x] 2.1 Refactor `src/lib/storage/profileStorage.ts` to query and mutate candidate profile exclusively in Supabase `profiles` table. Remove localStorage reads and writes. Verify unit tests in `src/__tests__/profileStorage.test.ts` pass or update them to reflect Supabase storage.
- [x] 2.2 Refactor `src/lib/storage/sessionStorage.ts` to persist and retrieve search tracks strictly through Supabase `search_sessions` table with full schema field mappings (`target_role`, `spoken_languages`, `provider_options`). Remove localStorage fallback logic.
- [x] 2.3 Refactor `src/lib/storage/checkpointStorage.ts` to manage scan pagination cursors purely via Supabase `scan_checkpoints` table. Remove localStorage fallback logic.
- [x] 2.4 Refactor `src/lib/storage/matchStorage.ts` to store and query session matches from `job_matches` table, and load/save applied vacancies via `job_matches` where `status = 'applied'`. Remove `jobify:matches:*` and `jobify:applied` localStorage references.

## 3. UI Hydration & Session Creation Alignment

- [x] 3.1 Update `src/components/CreateSessionModal.tsx` and `src/app/page.tsx` session creation logic to ensure new tracks are saved directly to Supabase with the active candidate profile ID.
- [x] 3.2 Update `src/app/page.tsx` initialization `useEffect` to sequentially load profile -> load profile sessions -> hydrate matches and applied list from Supabase without spurious implicit session overwrites on page reload.
- [x] 3.3 Update vacancy action handlers in `src/app/page.tsx` (`handleDismiss`, `handleApply`, `handleRemoveFromApplied`, `handleResetSession`) to persist vacancy status updates directly to Supabase.

## 4. Verification and Testing

- [x] 4.1 Update and run test suite (`npm test`) covering `sessionStorage`, `matchStorage`, `profileStorage`, and `sessionManagement` to verify all storage operations function without errors.
- [x] 4.2 Run end-to-end typecheck and build (`npm run build`) to ensure there are no compilation or typing issues.
