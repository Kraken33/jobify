# Design: Dismiss Vacancy to 0% Match Score

## Context

See `proposal.md` for motivation. Currently, `handleDismiss` in `page.tsx` removes the match from local state and calls `updateMatchStatus(..., 'dismissed', ...)`. `loadSessionMatches` in `matchStorage.ts` filters for `status = 'active'` or `status is null`, causing dismissed vacancies to vanish completely.

## Goals / Non-Goals

**Goals:**
- Update vacancy dismissal behavior so that dismissed items remain in local `matches` state with `evaluation.score = 0`.
- Update Supabase `job_matches` database row `fit_score` column to `0` while maintaining `status = 'active'`.
- Preserve existing card visual styling, displaying `0% Match` in the standard rose badge, while preserving the OpenAI verdict, pros, gaps, and summary.
- Hide or disable the "Not for me" dismiss button on cards whose match score is already 0%.
- Ensure automatic sort by Fit score sinks 0% matches to the bottom.

**Non-Goals:**
- Implementing an undo / restore original score mechanism.
- Modifying the AI evaluation payload generation or backend scoring logic.
- Adding special dimmed or altered card layouts.

## Decisions

### 1. Database Storage: Direct `fit_score = 0` Update
- **Decision**: Introduce `updateMatchScore(matchId, score, providerJobId)` in `matchStorage.ts` that issues a Supabase `UPDATE job_matches SET fit_score = 0` matching by `id` or `provider_job_id`.
- **Rationale**: Keeps the table schema unchanged, preserves standard `loadSessionMatches` query (`status = 'active'`), and ensures 0% scored jobs are returned and displayed seamlessly across sessions.
- **Alternatives Considered**: Storing original score and adding `dismissed` status with modified loader query. Rejected because updating `fit_score = 0` is cleaner and directly aligns with the domain concept of setting the match score to 0.

### 2. UI State Transition in `page.tsx`
- **Decision**: In `handleDismiss`, map over the `matches` state to update the target match's `evaluation.score = 0` instead of filtering it out:
  ```ts
  setMatches((prev) =>
    prev.map((m) =>
      m.id === matchId || m.job.id === matchId
        ? { ...m, evaluation: { ...m.evaluation, score: 0 } }
        : m
    )
  );
  ```
- **Rationale**: Provides instant optimistic UI updates without layout jumps or removing cards from the DOM.

### 3. Action Visibility in `JobCard.tsx`
- **Decision**: In `JobCard.tsx`, update the condition for rendering the "Not for me" button:
  `!hideActions && !isApplied && evaluation.score > 0`
- **Rationale**: Once a job has been scored 0%, dismissing it again is redundant and confusing.

## Risks / Trade-offs

- **Risk**: 0% matches cluttering the view if many jobs are dismissed.
  - **Mitigation**: Default sorting places 0% matches at the very bottom. Furthermore, users can select `Min Score: 60%+ Match` (or higher) to immediately hide low and 0% scores.
