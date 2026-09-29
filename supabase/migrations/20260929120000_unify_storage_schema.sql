-- Migration: Unify Storage Schema for Search Sessions and Job Match Status

-- Extend search_sessions with missing model columns
alter table public.search_sessions
  add column if not exists target_role text,
  add column if not exists spoken_languages jsonb default '[]'::jsonb,
  add column if not exists provider_options jsonb default '{}'::jsonb;

-- Extend job_matches with status tracking column
alter table public.job_matches
  add column if not exists status text not null default 'active' check (status in ('active', 'applied', 'dismissed'));

-- Create performance indexes for querying matches by status and session
create index if not exists idx_job_matches_status on public.job_matches(status);
create index if not exists idx_job_matches_session_status on public.job_matches(session_id, status);
create index if not exists idx_job_matches_profile_status on public.job_matches(profile_id, status);
