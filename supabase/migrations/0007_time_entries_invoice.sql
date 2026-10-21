-- Links time entries to the invoice they were billed on. Deleting the invoice
-- leaves its entries unbilled again (on delete set null).
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.time_entries
  add column invoice_id uuid references public.invoices (id) on delete set null;

create index time_entries_invoice_id_idx on public.time_entries (invoice_id);
