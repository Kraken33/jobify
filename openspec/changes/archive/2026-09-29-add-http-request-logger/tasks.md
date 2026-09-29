# Tasks

## 1. Core Logger, Sanitizer & In-Memory Store

- [x] 1.1 Implement `src/lib/logger/sanitizer.ts` with secret redaction for query parameters and auth headers, and verify with unit tests in `src/__tests__/loggerSanitizer.test.ts`
- [x] 1.2 Implement `src/lib/logger/logStore.ts` ring buffer store supporting max capacity (200), newest-first retrieval, provider filtering, and clearing, verified with unit tests in `src/__tests__/logStore.test.ts`
- [x] 1.3 Implement `src/lib/logger/loggedFetch.ts` wrapper with timing, response status extraction, error handling, and store recording, verified with unit tests in `src/__tests__/loggedFetch.test.ts`

## 2. Provider Adapter Instrumentation

- [x] 2.1 Update `src/lib/providers/JustJoinProvider.ts` to use `loggedFetch` and verify provider tests pass
- [x] 2.2 Update `src/lib/providers/ArbeitsagenturProvider.ts` to use `loggedFetch` and verify provider tests pass
- [x] 2.3 Update `src/lib/providers/ArbeitnowProvider.ts` to use `loggedFetch` and verify provider tests pass

## 3. Logs API Route

- [x] 3.1 Implement `src/app/api/logs/route.ts` supporting `GET` (with optional `provider` query filter) and `DELETE` (to clear buffer), verified with route unit tests in `src/__tests__/logsRoute.test.ts`

## 4. In-App Logs Dashboard UI

- [x] 4.1 Build `src/app/logs/page.tsx` with live HTTP request list, status badges, latency timers, search, provider filters, expandable payload inspector, and clear/refresh actions
- [x] 4.2 Add navigation link/button to `/logs` in the app navigation/header for easy developer access

## 5. Verification & Integration

- [x] 5.1 Run all test suites (`npm test`) and verify end-to-end that search scans capture provider requests in the log buffer and render correctly on `/logs`
