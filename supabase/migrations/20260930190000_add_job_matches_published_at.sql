-- Migration: Add published_at column to job_matches table

alter table public.job_matches
  add column if not exists published_at timestamp with time zone;

create index if not exists idx_job_matches_published_at on public.job_matches(published_at desc);
