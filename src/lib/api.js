// All Supabase reads/writes live here. The rest of the app works with camelCase objects;
// these helpers translate to and from the snake_case database rows.
import { supabase } from './supabase';
import { createSeedData } from '../data/seed';

function check({ data, error }) {
  if (error) throw error;
  return data;
}

const toTime = (value) => (value ? value.slice(0, 5) : undefined); // "14:00:00" -> "14:00"
const orNull = (value) => (value === '' || value === undefined ? null : value);

// ---------- Mappers ----------
const taskFromRow = (r) => ({
  id: r.id,
  date: r.date,
  title: r.title,
  description: r.description ?? '',
  category: r.category,
  start: toTime(r.start_time),
  end: toTime(r.end_time),
  done: r.done,
});

const taskToRow = (t) => ({
  id: t.id,
  title: t.title,
  description: t.description ?? '',
  category: t.category,
  date: t.date,
  start_time: orNull(t.start),
  end_time: orNull(t.end),
  done: Boolean(t.done),
});

const eventFromRow = (r) => ({
  id: r.id,
  date: r.date,
  title: r.title,
  category: r.category,
  start: toTime(r.start_time),
  end: toTime(r.end_time),
  person: r.person ?? undefined,
});

const eventToRow = (e) => ({
  id: e.id,
  title: e.title,
  category: e.category,
  date: e.date,
  start_time: orNull(e.start),
  end_time: orNull(e.end),
  person: orNull(e.person),
});

const invoiceFromRow = (r) => ({
  id: r.id,
  number: r.number,
  client: r.client?.name ?? '',
  date: r.date,
  dueDate: r.due_date ?? '',
  orderNumber: r.order_number ?? '',
  reference: r.reference ?? '',
  terms: r.terms ?? '',
  subject: r.subject ?? '',
  discount: Number(r.discount),
  status: r.status,
  type: r.type,
  archived: r.archived,
  recurring: r.recurring,
  items: [...(r.items ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((i) => ({
      id: i.id,
      description: i.description,
      quantity: Number(i.quantity),
      rate: Number(i.rate),
      taxRate: Number(i.tax_rate),
    })),
});

const invoiceToRow = (inv, clientId) => ({
  id: inv.id,
  client_id: clientId,
  number: inv.number,
  order_number: orNull(inv.orderNumber),
  reference: orNull(inv.reference),
  date: inv.date,
  due_date: orNull(inv.dueDate),
  terms: orNull(inv.terms),
  subject: orNull(inv.subject),
  discount: Number(inv.discount) || 0,
  status: inv.status,
  type: inv.type,
  archived: Boolean(inv.archived),
  recurring: Boolean(inv.recurring),
});

const itemsToRows = (inv) =>
  inv.items.map((item, position) => ({
    id: item.id,
    invoice_id: inv.id,
    position,
    description: item.description,
    quantity: Number(item.quantity) || 0,
    rate: Number(item.rate) || 0,
    tax_rate: Number(item.taxRate) || 0,
  }));

// ---------- Reads ----------
export async function fetchAll() {
  const [tasks, events, invoices, clients] = (
    await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('events').select('*'),
      supabase.from('invoices').select('*, client:clients(name), items:invoice_items(*)'),
      supabase.from('clients').select('id, name').order('name'),
    ])
  ).map(check);

  return {
    tasks: tasks.map(taskFromRow),
    events: events.map(eventFromRow),
    invoices: invoices.map(invoiceFromRow),
    clients,
  };
}

// ---------- Tasks & events ----------
export const insertTask = async (task) => check(await supabase.from('tasks').insert(taskToRow(task)));

export const setTaskDone = async (id, done) => check(await supabase.from('tasks').update({ done }).eq('id', id));

export const insertEvent = async (event) => check(await supabase.from('events').insert(eventToRow(event)));

// ---------- Invoices ----------
// Finds the client by name, creating it the first time it's used.
async function ensureClient(name) {
  return check(
    await supabase.from('clients').upsert({ name }, { onConflict: 'user_id,name' }).select('id, name').single(),
  );
}

// Saves the invoice and replaces its line items. Returns the client row.
// TODO: move into a Postgres function so the three steps run in one transaction.
export async function saveInvoice(invoice) {
  const client = await ensureClient(invoice.client);
  check(await supabase.from('invoices').upsert(invoiceToRow(invoice, client.id)));
  check(await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id));
  if (invoice.items.length) check(await supabase.from('invoice_items').insert(itemsToRows(invoice)));
  return client;
}

export async function updateInvoices(ids, patch) {
  const row = {};
  if ('status' in patch) row.status = patch.status;
  if ('archived' in patch) row.archived = patch.archived;
  check(await supabase.from('invoices').update(row).in('id', ids));
}

export const deleteInvoices = async (ids) => check(await supabase.from('invoices').delete().in('id', ids));

// ---------- Sample data for new accounts ----------
export async function seedSampleData() {
  const { tasks, events, invoices } = createSeedData();
  const names = [...new Set(invoices.map((i) => i.client))];
  const clients = check(
    await supabase
      .from('clients')
      .upsert(names.map((name) => ({ name })), { onConflict: 'user_id,name' })
      .select('id, name'),
  );
  const clientId = Object.fromEntries(clients.map((c) => [c.name, c.id]));

  check(await supabase.from('tasks').insert(tasks.map(taskToRow)));
  check(await supabase.from('events').insert(events.map(eventToRow)));
  check(await supabase.from('invoices').insert(invoices.map((inv) => invoiceToRow(inv, clientId[inv.client]))));
  check(await supabase.from('invoice_items').insert(invoices.flatMap(itemsToRows)));
}
