-- Migration: Init Jobify MVP Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  target_role text not null,
  seniority text not null check (seniority in ('junior', 'mid', 'senior', 'lead')),
  skills text[] not null default '{}',
  work_mode text not null check (work_mode in ('remote', 'hybrid', 'office', 'any')),
  preferred_location text,
  min_salary integer,
  salary_currency text default 'PLN',
  experience_summary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: job_matches
create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  provider text not null default 'justjoin',
  provider_job_id text not null,
  title text not null,
  company text not null,
  city text,
  is_remote boolean default false,
  seniority text,
  url text not null,
  salary_min integer,
  salary_max integer,
  salary_currency text,
  required_skills text[] default '{}',
  fit_score integer not null check (fit_score >= 0 and fit_score <= 100),
  verdict text not null,
  pros text[] default '{}',
  gaps text[] default '{}',
  summary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_job_matches_profile_id on public.job_matches(profile_id);
create index if not exists idx_job_matches_fit_score on public.job_matches(fit_score desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.job_matches enable row level security;

-- Policies for public demo / authenticated users
create policy "Allow all actions on profiles"
  on public.profiles for all
  using (true)
  with check (true);

create policy "Allow all actions on job_matches"
  on public.job_matches for all
  using (true)
  with check (true);
