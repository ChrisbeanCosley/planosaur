-- Invoice-level VAT: one rate charged on the discounted subtotal, shown as a VAT line.
-- NULL means no invoice-level VAT (older invoices keep their per-line tax rates).
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.invoices
  add column vat_rate numeric(6, 4) check (vat_rate is null or (vat_rate >= 0 and vat_rate <= 1));

-- Same as migration 0002, now also saving vat_rate.
create or replace function public.save_invoice(p_invoice jsonb, p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_invoice_id uuid := (p_invoice ->> 'id')::uuid;
  v_client_name text := btrim(p_invoice ->> 'client');
  v_client_id uuid;
begin
  if v_invoice_id is null then
    raise exception 'Invoice id is required';
  end if;
  if v_client_name is null or v_client_name = '' then
    raise exception 'Invoice needs a customer name';
  end if;

  -- Find the client by name, creating it the first time it's used.
  insert into public.clients (name)
  values (v_client_name)
  on conflict (user_id, name) do update set name = excluded.name
  returning id into v_client_id;

  -- Create or update the invoice.
  insert into public.invoices (
    id, client_id, number, order_number, reference, date, due_date,
    terms, subject, discount, vat_rate, status, type, archived, recurring
  )
  values (
    v_invoice_id,
    v_client_id,
    p_invoice ->> 'number',
    nullif(p_invoice ->> 'order_number', ''),
    nullif(p_invoice ->> 'reference', ''),
    coalesce(nullif(p_invoice ->> 'date', '')::date, current_date),
    nullif(p_invoice ->> 'due_date', '')::date,
    nullif(p_invoice ->> 'terms', ''),
    nullif(p_invoice ->> 'subject', ''),
    coalesce((p_invoice ->> 'discount')::numeric, 0),
    nullif(p_invoice ->> 'vat_rate', '')::numeric,
    coalesce(p_invoice ->> 'status', 'unpaid'),
    coalesce(p_invoice ->> 'type', 'invoice'),
    coalesce((p_invoice ->> 'archived')::boolean, false),
    coalesce((p_invoice ->> 'recurring')::boolean, false)
  )
  on conflict (id) do update set
    client_id = excluded.client_id,
    number = excluded.number,
    order_number = excluded.order_number,
    reference = excluded.reference,
    date = excluded.date,
    due_date = excluded.due_date,
    terms = excluded.terms,
    subject = excluded.subject,
    discount = excluded.discount,
    vat_rate = excluded.vat_rate,
    status = excluded.status,
    type = excluded.type,
    archived = excluded.archived,
    recurring = excluded.recurring;

  -- Replace the line items, keeping the order they were sent in.
  delete from public.invoice_items where invoice_id = v_invoice_id;

  insert into public.invoice_items (id, invoice_id, position, description, quantity, rate, tax_rate)
  select
    coalesce(nullif(item ->> 'id', '')::uuid, gen_random_uuid()),
    v_invoice_id,
    (ordinality - 1)::integer,
    coalesce(item ->> 'description', ''),
    coalesce((item ->> 'quantity')::numeric, 0),
    coalesce((item ->> 'rate')::numeric, 0),
    coalesce((item ->> 'tax_rate')::numeric, 0)
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as t(item, ordinality);

  return jsonb_build_object('id', v_client_id, 'name', v_client_name);
end;
$$;

-- Only signed-in users may call it.
revoke execute on function public.save_invoice(jsonb, jsonb) from public, anon;
grant execute on function public.save_invoice(jsonb, jsonb) to authenticated;
