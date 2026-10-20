-- Expenses: money going out (software, travel, equipment, ...).
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null default current_date,
  payee text not null,
  description text not null default '',
  category text not null default 'other' check (
    category in ('software', 'equipment', 'office', 'travel', 'meals', 'marketing', 'utilities', 'other')
  ),
  amount numeric(14, 2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index expenses_user_id_date_idx on public.expenses (user_id, date);

-- Users only see and change their own expenses.
alter table public.expenses enable row level security;

create policy "Users manage their own expenses" on public.expenses
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
