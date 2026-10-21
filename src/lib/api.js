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
  priority: r.priority ?? 'normal', // migration 0009
  reminderAt: r.reminder_at ?? null, // ISO timestamp of the reminder email, or null
  reminderSentAt: r.reminder_sent_at ?? null,
});

// Whether tasks.priority / reminder_at exist (migration 0009). Set by fetchAll; until then those
// fields aren't sent, so saving tasks keeps working.
let tasksHavePriority = true;

const taskToRow = (t) => ({
  id: t.id,
  title: t.title,
  description: t.description ?? '',
  category: t.category,
  date: t.date,
  start_time: orNull(t.start),
  end_time: orNull(t.end),
  done: Boolean(t.done),
  ...(tasksHavePriority
    ? { priority: t.priority ?? 'normal', reminder_at: t.reminderAt ?? null, reminder_sent_at: t.reminderSentAt ?? null }
    : {}),
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
  // Invoice-level VAT rate (migration 0008); null = none, or an older per-line-tax invoice.
  vatRate: r.vat_rate === null || r.vat_rate === undefined ? null : Number(r.vat_rate),
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
  // Only sent when set, so saving still works before migration 0008 is run.
  ...(inv.vatRate === null || inv.vatRate === undefined || inv.vatRate === '' ? {} : { vat_rate: Number(inv.vatRate) }),
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

const expenseFromRow = (r) => ({
  id: r.id,
  date: r.date,
  payee: r.payee,
  description: r.description ?? '',
  category: r.category,
  amount: Number(r.amount),
});

const expenseToRow = (e) => ({
  id: e.id,
  date: e.date,
  payee: e.payee,
  description: e.description ?? '',
  category: e.category,
  amount: Number(e.amount) || 0,
});

const receiptFromRow = (r) => ({
  id: r.id,
  expenseId: r.expense_id,
  path: r.path,
  fileName: r.file_name,
  mimeType: r.mime_type,
  size: r.size_bytes,
});

// PostgREST's "table not found" code: a migration hasn't been run yet.
const TABLE_MISSING = 'PGRST205';

// Returns [rows, missing] so a not-yet-created table doesn't break the rest of the app.
const optionalTable = (res) => (res.error?.code === TABLE_MISSING ? [[], true] : [check(res), false]);

// Postgres "column does not exist": migration 0007 (time_entries.invoice_id) hasn't been run yet.
const COLUMN_MISSING = '42703';

// ---------- Reads ----------
export async function fetchAll() {
  const [tasksRes, eventsRes, invoicesRes, clientsRes, expensesRes, receiptsRes, timeRes, timeInvoiceRes, priorityRes] = await Promise.all([
    supabase.from('tasks').select('*'),
    supabase.from('events').select('*'),
    supabase.from('invoices').select('*, client:clients(name), items:invoice_items(*)'),
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('expenses').select('*'),
    supabase.from('expense_receipts').select('*').order('created_at'),
    supabase.from('time_entries').select('*').order('started_at'),
    supabase.from('time_entries').select('invoice_id').limit(1),
    supabase.from('tasks').select('priority').limit(1),
  ]);
  const [tasks, events, invoices, clients] = [tasksRes, eventsRes, invoicesRes, clientsRes].map(check);
  tasksHavePriority = priorityRes.error?.code !== COLUMN_MISSING;
  const [expenses, expensesMissing] = optionalTable(expensesRes);
  const [receipts, receiptsMissing] = optionalTable(receiptsRes);
  const [timeEntries, timeEntriesMissing] = optionalTable(timeRes);

  return {
    tasks: tasks.map(taskFromRow),
    events: events.map(eventFromRow),
    invoices: invoices.map(invoiceFromRow),
    clients,
    expenses: expenses.map(expenseFromRow),
    expensesMissing,
    receipts: receipts.map(receiptFromRow),
    receiptsMissing,
    timeEntries: timeEntries.map(timeEntryFromRow),
    timeEntriesMissing,
    timeInvoicingMissing: timeEntriesMissing || timeInvoiceRes.error?.code === COLUMN_MISSING,
    taskPriorityMissing: !tasksHavePriority,
  };
}

// ---------- Clients ----------
// Finds a client by name, creating it the first time it's used. Returns { id, name }.
export const findOrCreateClient = async (name) =>
  check(await supabase.from('clients').upsert({ name }, { onConflict: 'user_id,name' }).select('id, name').single());

// ---------- Time tracking (see supabase/migrations/0006_time_entries.sql) ----------
function timeEntryFromRow(r) {
  return {
    id: r.id,
    description: r.description ?? '',
    clientId: r.client_id,
    start: r.started_at,
    end: r.ended_at, // null while the timer is running
    billable: r.billable,
    rate: r.hourly_rate === null ? null : Number(r.hourly_rate),
    invoiceId: r.invoice_id ?? null, // set once billed (migration 0007)
  };
}

const timeEntryToRow = (t) => ({
  id: t.id,
  description: t.description ?? '',
  client_id: t.clientId ?? null,
  started_at: t.start,
  ended_at: t.end ?? null,
  billable: Boolean(t.billable),
  hourly_rate: t.rate === null || t.rate === '' || t.rate === undefined ? null : Number(t.rate),
  // Only sent when set, so saves still work before migration 0007. Unbilling happens via the FK.
  ...(t.invoiceId ? { invoice_id: t.invoiceId } : {}),
});

export const insertTimeEntry = async (entry) =>
  check(await supabase.from('time_entries').insert(timeEntryToRow(entry)));

export const updateTimeEntry = async (entry) =>
  check(await supabase.from('time_entries').update(timeEntryToRow(entry)).eq('id', entry.id));

export const deleteTimeEntry = async (id) => check(await supabase.from('time_entries').delete().eq('id', id));

// Marks entries as billed on an invoice (or unbilled, with null).
export const setTimeEntriesInvoice = async (ids, invoiceId) =>
  check(await supabase.from('time_entries').update({ invoice_id: invoiceId }).in('id', ids));

// ---------- Expenses ----------
export const insertExpense = async (expense) =>
  check(await supabase.from('expenses').insert(expenseToRow(expense)));

export const updateExpense = async (expense) =>
  check(await supabase.from('expenses').update(expenseToRow(expense)).eq('id', expense.id));

// Removes the expense's receipt files too (the receipt rows go with the expense via cascade).
export async function deleteExpense(id, receiptPaths = []) {
  if (receiptPaths.length) await supabase.storage.from(RECEIPTS_BUCKET).remove(receiptPaths);
  check(await supabase.from('expenses').delete().eq('id', id));
}

// ---------- Expense receipts (see supabase/migrations/0005_expense_receipts.sql) ----------
const RECEIPTS_BUCKET = 'receipts';

export const RECEIPT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

const safeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80) || 'receipt';

// Uploads one file and records it against the expense. Returns the new receipt.
export async function uploadReceipt(expenseId, file) {
  // Some systems leave HEIC files without a type; fall back on the extension.
  const type = file.type || (/\.hei[cf]$/i.test(file.name) ? 'image/heic' : '');
  if (!RECEIPT_TYPES.includes(type)) throw new Error(`${file.name}: only photos (JPG, PNG, WebP, HEIC) and PDFs can be attached.`);
  if (file.size > RECEIPT_MAX_BYTES) throw new Error(`${file.name} is larger than 10 MB.`);

  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user?.id;
  const path = `${userId}/${expenseId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

  check(await supabase.storage.from(RECEIPTS_BUCKET).upload(path, file, { contentType: type }));
  const row = check(
    await supabase
      .from('expense_receipts')
      .insert({ expense_id: expenseId, path, file_name: file.name, mime_type: type, size_bytes: file.size })
      .select()
      .single(),
  );
  return receiptFromRow(row);
}

export async function deleteReceipt(receipt) {
  await supabase.storage.from(RECEIPTS_BUCKET).remove([receipt.path]);
  check(await supabase.from('expense_receipts').delete().eq('id', receipt.id));
}

// The file itself, as a Blob (used by the monthly receipts export).
export const downloadReceipt = async (path) => check(await supabase.storage.from(RECEIPTS_BUCKET).download(path));

// Short-lived links for viewing private receipt files. Returns { [path]: url }.
export async function receiptUrls(paths, seconds = 600) {
  if (!paths.length) return {};
  const data = check(await supabase.storage.from(RECEIPTS_BUCKET).createSignedUrls(paths, seconds));
  return Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

// ---------- Tasks & events ----------
export const insertTask = async (task) => check(await supabase.from('tasks').insert(taskToRow(task)));

export const setTaskDone = async (id, done) => check(await supabase.from('tasks').update({ done }).eq('id', id));

export const updateTask = async (task) =>
  check(await supabase.from('tasks').update(taskToRow(task)).eq('id', task.id));

export const deleteTask = async (id) => check(await supabase.from('tasks').delete().eq('id', id));

export const insertEvent = async (event) => check(await supabase.from('events').insert(eventToRow(event)));

export const updateEvent = async (event) =>
  check(await supabase.from('events').update(eventToRow(event)).eq('id', event.id));

export const deleteEvent = async (id) => check(await supabase.from('events').delete().eq('id', id));

// ---------- Invoices ----------
// Saves the invoice, its client and its line items in one transaction via the
// save_invoice database function (supabase/migrations/0002). Returns { id, name } of the client.
export async function saveInvoice(invoice) {
  // client_id is left out: the function looks the client up (or creates it) from the name.
  const { client_id: _unused, ...row } = invoiceToRow(invoice, null);
  return check(
    await supabase.rpc('save_invoice', {
      p_invoice: { ...row, client: invoice.client },
      p_items: itemsToRows(invoice),
    }),
  );
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
