-- Migration: Add Unique Constraint / Indexes on Job Matches to Prevent Duplicate Persistence

-- 1. Prune duplicate rows keeping the latest row for each (session_id, provider_job_id)
delete from public.job_matches a using (
  select min(ctid) as min_ctid, session_id, provider_job_id
  from public.job_matches
  where session_id is not null
  group by session_id, provider_job_id
  having count(*) > 1
) b
where a.session_id = b.session_id
  and a.provider_job_id = b.provider_job_id
  and a.ctid <> b.min_ctid;

delete from public.job_matches a using (
  select min(ctid) as min_ctid, provider_job_id
  from public.job_matches
  where session_id is null
  group by provider_job_id
  having count(*) > 1
) b
where a.session_id is null
  and a.provider_job_id = b.provider_job_id
  and a.ctid <> b.min_ctid;

-- 2. Create unique indexes for session-scoped and implicit-session matches
create unique index if not exists idx_job_matches_session_provider_job
  on public.job_matches(session_id, provider_job_id);

create unique index if not exists idx_job_matches_null_session_provider_job
  on public.job_matches(provider_job_id)
  where session_id is null;
