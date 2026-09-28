# Design: Jobify MVP Architecture

## Context
See `proposal.md` for motivation and background. This is a greenfield full-stack TypeScript application aimed at accelerating candidate job matching on JustJoin.it with AI scoring.

## Goals / Non-Goals

**Goals:**
- Provide a responsive Next.js web application for candidate profile entry and matching visualization.
- Implement an extensible TypeScript adapter interface (`JobProvider`) with an initial concrete implementation for JustJoin.it.
- Securely leverage client-provided OpenAI API keys (BYOK) without persisting credentials in any database.
- Use Supabase (PostgreSQL) for storing user profiles and analyzed job match results.
- Implement batch screening and OpenAI structured output parsing (`gpt-4o-mini`) to deliver actionable match scores and fit breakdowns.

**Non-Goals:**
- Automated direct applications or resume submission bots (links point to external job pages).
- Multi-provider support in the initial MVP release (architected for extension, but only JustJoin.it is wired).
- PDF resume parsing/OCR (MVP relies on explicit manual form inputs and experience summary text).
- Real-time background continuous scraping/cron notifications (MVP evaluates on-demand when the user triggers a scan).

## Decisions

### 1. Application Framework & Stack
- **Choice**: Next.js (App Router, TypeScript) + Supabase (Auth & Postgres DB) + Tailwind CSS.
- **Rationale**: Next.js provides full-stack capabilities (React server/client components + API route handlers) in a single codebase. Supabase provides ready-to-use authentication and PostgreSQL persistence without complex infrastructure setup.
- **Alternatives Considered**:
  - *Separate Express/FastAPI backend + Vite frontend*: Increases deployment complexity and requires coordinating two repositories/build steps for an MVP.

### 2. Client-Side API Key Management (BYOK)
- **Choice**: Store the OpenAI API key in browser `localStorage`. When the user runs a matching scan, the key is passed in an HTTP request header (`X-OpenAI-Key`) to the Next.js API route executing the evaluation, then discarded from memory.
- **Rationale**: Zero liability and zero database storage of sensitive user third-party credentials.
- **Alternatives Considered**:
  - *Database Vault / Encryption*: Requires managing master encryption keys and presents compliance/security concerns for user-provided secrets.

### 3. Extensible Job Provider Architecture
- **Choice**: Define an abstract provider interface:
  ```typescript
  interface JobListing {
    id: string;
    provider: 'justjoin';
    title: string;
    company: string;
    city?: string;
    isRemote: boolean;
    seniority: 'junior' | 'mid' | 'senior';
    requiredSkills: string[];
    salaryRange?: { min: number; max: number; currency: string };
    url: string;
    description?: string;
  }

  interface JobProvider {
    name: string;
    searchJobs(criteria: SearchCriteria): Promise<JobListing[]>;
  }
  ```
- **Rationale**: Isolates JustJoin.it API specifics behind a clean contract, enabling LinkedIn or other provider adapters to be added later without touching matching or UI logic.

### 4. LLM Fit Evaluation & Structured Outputs
- **Choice**: Use OpenAI `gpt-4o-mini` with JSON mode / structured schema.
- **Prompt input**: Candidate profile (target role, seniority, skills, bio) + Job details (title, company, required skills, summary).
- **Output schema**:
  ```json
  {
    "score": 85,
    "verdict": "Strong Match",
    "pros": ["Extensive React and Next.js experience aligns with core stack"],
    "gaps": ["Requires experience with GraphQL, which was not mentioned"],
    "summary": "Strong technical overlap for the frontend responsibilities with minor gaps in API layer."
  }
  ```
- **Rationale**: `gpt-4o-mini` is extremely fast and cost-effective for batch evaluation (~$0.001 per job analysis), producing consistent structured data.

## Risks / Trade-offs

- **[JustJoin.it API changes or rate limits]** → Wrap API calls in caching/retry logic with clear error messages when endpoints shift.
- **[Token consumption & latency on large batches]** → Limit search queries to 20-30 listings per scan; apply hard-filtering (e.g. reject non-remote if remote-only) before calling OpenAI.
- **[Invalid/depleted OpenAI API keys]** → Validate key format on input and surface explicit HTTP 401/429 feedback to the user during scans.
