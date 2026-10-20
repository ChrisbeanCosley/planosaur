-- Receipts attached to expenses: photos of till slips, or PDFs such as supplier invoices.
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- ---------- Private file storage ----------
-- Files live at receipts/<user id>/<expense id>/<file>; each user can only touch their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760, -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

create policy "Users read their own receipts" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users upload their own receipts" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own receipts" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- Which files belong to which expense ----------
create table public.expense_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expense_id uuid not null references public.expenses (id) on delete cascade,
  path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null default 0,
  created_at timestamptz not null default now()
);

create index expense_receipts_expense_id_idx on public.expense_receipts (expense_id);
create index expense_receipts_user_id_idx on public.expense_receipts (user_id);

alter table public.expense_receipts enable row level security;

create policy "Users manage their own expense receipts" on public.expense_receipts
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
