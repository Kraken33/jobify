# Tasks

## 1. Storage & Match Partitioning

- [x] 1.1 Add `deleteSession(sessionId: string)` to `src/lib/storage/sessionStorage.ts` to remove the session from localStorage and Supabase `search_sessions`, and verify it cleans up localStorage sessions properly.
- [x] 1.2 Create `src/lib/storage/matchStorage.ts` with `loadSessionMatches(sessionId: string): Promise<MatchResult[]>`, `saveSessionMatches(sessionId: string, matches: MatchResult[]): Promise<void>`, and `clearSessionMatches(sessionId: string): Promise<void>`. Verify with a unit test that matches are saved and retrieved correctly per session ID without cross-contamination.

## 2. Session Creation Modal Component

- [x] 2.1 Create `src/components/CreateSessionModal.tsx` providing form inputs for Track Name, Skills tag selector, Seniority, Work Mode, and Preferred Location, with an "Inherit configuration from Profile" toggle. Verify it pre-populates fields when the toggle is enabled and clears them when disabled.
- [x] 2.2 Add validation and submit handling in `CreateSessionModal` that generates a new session via `saveSession` and calls an `onSessionCreated` callback. Verify that canceling or closing dismisses the modal cleanly without creating a session.

## 3. MatchesBoard & Main Page Integration

- [x] 3.1 Update `src/components/MatchesBoard.tsx` to include "+ New Track" and "Delete Track" controls alongside the session dropdown. Ensure "Delete Track" is disabled or hidden when only one session exists, and prompts for confirmation before deletion.
- [x] 3.2 Update `src/app/page.tsx` to load and maintain matches partitioned by active session ID (`loadSessionMatches`), saving new scan results per session via `saveSessionMatches`. Verify switching between sessions immediately displays the corresponding session's matches.
- [x] 3.3 Wire up `deleteSession` in `page.tsx` to clear session matches, checkpoints, update session state, and select an adjacent remaining session. Verify deleting a session does not cause errors or leave dangling state.

## 4. Verification & Testing

- [x] 4.1 Write integration unit tests in `src/__tests__/sessionManagement.test.ts` verifying session creation, profile inheritance toggle behavior, per-session match isolation, and session deletion. Run tests with `npm test` and verify all tests pass.
- [x] 4.2 Run `npm run build` or `npm run lint` to ensure TypeScript compilation and component prop typing succeed without errors.
