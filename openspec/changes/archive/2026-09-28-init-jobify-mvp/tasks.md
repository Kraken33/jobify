# Tasks: Jobify MVP Implementation

## 1. Project Initialization & Infrastructure

- [x] 1.1 Scaffold Next.js TypeScript application with Tailwind CSS and verify the development server builds cleanly (`npm run dev`)
- [x] 1.2 Initialize Supabase client and schema definitions for user profiles and cached job matches, verifying local connection and migration execution
- [x] 1.3 Configure shared TypeScript interfaces (`CandidateProfile`, `JobListing`, `JobProvider`, `MatchResult`) and verify TypeScript compilation passes without errors

## 2. Candidate Profile & Client-Side API Key Storage

- [x] 2.1 Implement candidate profile input form (target roles, seniority, skills tags, salary, work mode, experience summary) and verify submission persists to Supabase
- [x] 2.2 Implement client-side OpenAI API key manager (save, retrieve, clear from `localStorage`) with UI status indicator and test that keys are never stored on the server
- [x] 2.3 Write component and integration tests for profile validation and key management, verifying all tests pass

## 3. Extensible Provider Layer & JustJoin.it Adapter

- [x] 3.1 Implement the `JobProvider` interface contract and base utilities for HTTP requests and response normalization
- [x] 3.2 Build the `JustJoinProvider` adapter querying JustJoin.it public listings endpoints by category, seniority, and remote status, mapping to normalized `JobListing` objects
- [x] 3.3 Add unit tests with mock API responses for JustJoin.it ingestion and verify normalization handles missing fields and salary ranges correctly

## 4. OpenAI Job Matching Engine

- [x] 4.1 Implement rule-based pre-filter (eliminating listings violating hard work mode and seniority constraints) and verify filtering logic with unit tests
- [x] 4.2 Implement Next.js API route `/api/match` accepting candidate profile, normalized jobs, and `X-OpenAI-Key` header, calling OpenAI `gpt-4o-mini` with structured JSON schema
- [x] 4.3 Add error handling for invalid/exhausted OpenAI API keys and rate limits, verifying user-friendly error responses are returned

## 5. UI Dashboard & Integration

- [x] 5.1 Build the Matches Board displaying job cards ranked by fit score (0-100), key pros, skill gaps, and direct links to apply on JustJoin.it
- [x] 5.2 Add on-demand scan triggers with progress/loading states and empty state views, verifying interactive flow in the browser
- [x] 5.3 Conduct end-to-end verification of the scan-and-match flow and verify zero lint or TypeScript compilation errors
