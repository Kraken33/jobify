# Tasks

## 1. Type Extensions

- [x] 1.1 Add `providerOptions?: Record<string, unknown>` to `SearchSession` in `src/types/index.ts` and verify TypeScript compiles without errors
- [x] 1.2 Add `providerHints?: { arbeitnow?: { endpoint?: string } }` to `SearchCriteria` in `src/types/index.ts` and verify TypeScript compiles without errors

## 2. Provider Adapter

- [x] 2.1 Update `ArbeitnowProvider.buildSearchUrl()` to (a) use the endpoint hint as the URL path segment and (b) inject the endpoint's implicit tag into the `tags` array (e.g. `english-speaking-jobs` → `"english speaking"`, `visa-sponsorship-jobs` → `"visa sponsorship"`); verify the combined path+tag appears in the built URL (e.g. `arbeitnow.com/english-speaking-jobs?...&tags=%5B%22english+speaking%22%5D`)
- [x] 2.2 Verify that endpoints with no associated tag (`jobs-with-salary`, `4-day-work-week-jobs`, `jobs-with-relocation`) only change the path and do not inject any extra tag; add a test confirming the `tags` param is absent or unchanged for these modes

## 3. API Route Threading

- [x] 3.1 In `src/app/api/match/route.ts`, read `session.providerOptions` and cast it to `{ arbeitnow?: { endpoint?: string } }`, then pass it as `providerHints` in the `provider.searchJobs()` call; verify the route still compiles

## 4. Session Modal UI

- [x] 4.1 Add `providerOptions` state and the `ARBEITNOW_ENDPOINT_OPTIONS` constant (with id, label, emoji for each of the 5 endpoints) to `CreateSessionModal.tsx`
- [x] 4.2 Render a row of tag chip toggles below the provider selector — visible only when `provider === "arbeitnow"` — where clicking a chip selects it (single-select) and clicking again deselects it; verify chips appear/disappear on provider change
- [x] 4.3 Include the selected `providerOptions` on the `SearchSession` object built in `handleSubmit`, and verify a session created with "English only" selected stores `providerOptions: { arbeitnow: { endpoint: "english-speaking-jobs" } }`
