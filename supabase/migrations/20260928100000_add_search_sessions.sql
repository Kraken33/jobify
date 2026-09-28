-- Migration: Add Search Sessions and Scan Checkpoints

-- Table: search_sessions
create table if not exists public.search_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  provider_id text not null default 'justjoin',
  skills text[] not null default '{}',
  seniority text not null,
  work_mode text not null,
  location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: scan_checkpoints (one row per session + provider)
create table if not exists public.scan_checkpoints (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.search_sessions(id) on delete cascade,
  provider_id text not null,
  provider_fingerprint text not null,
  published_at_cursor timestamp with time zone,
  seen_job_ids text[] default '{}',
  last_scan_at timestamp with time zone,
  unique (session_id, provider_id)
);

-- Extend job_matches with nullable session_id
alter table public.job_matches
  add column if not exists session_id uuid references public.search_sessions(id) on delete set null;

-- Indexes
create index if not exists idx_search_sessions_profile_id on public.search_sessions(profile_id);
create index if not exists idx_scan_checkpoints_session_id on public.scan_checkpoints(session_id);
create index if not exists idx_job_matches_session_id on public.job_matches(session_id);

-- RLS
alter table public.search_sessions enable row level security;
alter table public.scan_checkpoints enable row level security;

-- Policies for public demo / authenticated users matching existing pattern
create policy "Allow all actions on search_sessions"
  on public.search_sessions for all
  using (true)
  with check (true);

create policy "Allow all actions on scan_checkpoints"
  on public.scan_checkpoints for all
  using (true)
  with check (true);
