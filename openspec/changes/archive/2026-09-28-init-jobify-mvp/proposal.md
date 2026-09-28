# Proposal: Jobify MVP - AI-Assisted Job Discovery

## Why
Job hunting across tech portals like JustJoin.it is time-consuming and often requires manually reading dozens of job postings to verify technical stack fit, seniority alignment, and work preferences. Jobify MVP provides an automated discovery assistant where users enter their profile and connect their own OpenAI API key to fetch, filter, and score active listings from JustJoin.it, surfacing the most relevant opportunities with direct application links.

## What Changes
- Create an all-in-one TypeScript full-stack web application using Next.js (App Router) and Supabase.
- Implement a manual candidate profile form capturing target role, seniority level, core tech stack, salary expectations, work mode (remote/hybrid/office), and experience summary.
- Provide client-side Bring-Your-Own-Key (BYOK) OpenAI configuration stored strictly in browser storage (`localStorage`) and forwarded per scan request.
- Implement an extensible job provider adapter starting with JustJoin.it to ingest and normalize active job listings.
- Implement an LLM matching engine that pre-filters listings against hard constraints, prompts OpenAI for structured fit evaluations (0-100 score, pros, gaps, verdict), and displays ranked job matches with external links to the original job postings.

## Capabilities

### New Capabilities
- `candidate-profile`: Candidate profile setup and client-side OpenAI API key management.
- `job-provider-ingestion`: Extensible provider adapter layer and JustJoin.it integration for querying and normalizing listings.
- `job-matching-engine`: Filtering, OpenAI batch fit evaluation, and displaying ranked matches with direct links to apply.

### Modified Capabilities
None. (This is a greenfield project with no pre-existing capabilities).

## Impact
- **Framework**: Next.js (TypeScript, App Router, Tailwind CSS or modern UI styling).
- **Database & Auth**: Supabase (PostgreSQL for user profiles and cached match records).
- **External APIs**: JustJoin.it public listings endpoints and OpenAI API (`gpt-4o-mini`).
- **Security**: Zero server-side persistence of third-party OpenAI keys; client-side key storage only.
