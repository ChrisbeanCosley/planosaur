-- Planosaur initial schema.
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Every table carries a user_id that defaults to the signed-in user, and row level
-- security makes sure each user can only ever read or change their own rows.

-- ---------- Clients ----------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------- Invoices ----------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid references public.clients (id) on delete restrict,
  number text not null,
  order_number text,
  reference text,
  date date not null default current_date,
  due_date date,
  terms text,
  subject text,
  discount numeric(14, 2) not null default 0 check (discount >= 0),
  status text not null default 'unpaid' check (status in ('draft', 'unpaid', 'pending', 'paid')),
  type text not null default 'invoice' check (type in ('invoice', 'estimate')),
  archived boolean not null default false,
  recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  position integer not null default 0,
  description text not null default '',
  quantity numeric(14, 2) not null default 1,
  rate numeric(14, 2) not null default 0,
  tax_rate numeric(6, 4) not null default 0
);

-- ---------- Tasks ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'work' check (category in ('work', 'meetings', 'other')),
  date date not null default current_date,
  start_time time,
  end_time time,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Calendar events ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  category text not null default 'meeting' check (category in ('booking', 'meeting', 'work', 'personal')),
  date date not null,
  start_time time,
  end_time time,
  person text,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index clients_user_id_idx on public.clients (user_id);
create index invoices_user_id_idx on public.invoices (user_id);
create index invoices_client_id_idx on public.invoices (client_id);
create index invoice_items_invoice_id_idx on public.invoice_items (invoice_id);
create index invoice_items_user_id_idx on public.invoice_items (user_id);
create index tasks_user_id_date_idx on public.tasks (user_id, date);
create index events_user_id_date_idx on public.events (user_id, date);

-- ---------- Keep invoices.updated_at current ----------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- ---------- Row level security: users only see their own rows ----------
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;

create policy "Users manage their own clients" on public.clients
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own invoices" on public.invoices
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own invoice items" on public.invoice_items
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own tasks" on public.tasks
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own events" on public.events
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
