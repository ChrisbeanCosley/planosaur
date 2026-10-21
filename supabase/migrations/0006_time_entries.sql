-- Time tracking: a row per block of work. A running timer is a row with no ended_at.
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null default '',
  client_id uuid references public.clients (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  billable boolean not null default true,
  hourly_rate numeric(14, 2) check (hourly_rate is null or hourly_rate >= 0),
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create index time_entries_user_id_started_at_idx on public.time_entries (user_id, started_at);
create index time_entries_client_id_idx on public.time_entries (client_id);

-- At most one running timer per user.
create unique index time_entries_one_running_timer_idx on public.time_entries (user_id) where ended_at is null;

alter table public.time_entries enable row level security;

create policy "Users manage their own time entries" on public.time_entries
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
