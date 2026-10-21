// Helpers for time-tracking entries. Entry times are ISO timestamps; `end` is null while running.
import { toKey } from './date';

export const durationSeconds = (entry, now = new Date()) =>
  Math.max(0, Math.floor(((entry.end ? new Date(entry.end) : now) - new Date(entry.start)) / 1000));

// 5400 -> "1:30" (hours:minutes), for totals and lists.
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

// 5405 -> "01:30:05", for the live timer.
export function formatClock(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export const entryAmount = (entry, now) =>
  entry.billable && entry.rate ? (durationSeconds(entry, now) / 3600) * entry.rate : 0;

// The local calendar day an entry belongs to (the day it started).
export const entryDateKey = (entry) => toKey(new Date(entry.start));

// ISO timestamp -> "09:30" in local time.
export const timeOfDay = (iso) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

// "2026-10-20" + "09:30" -> ISO timestamp (local time).
export function combineDateTime(dateKey, time) {
  const [y, mo, d] = dateKey.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi).toISOString();
}

// The rate last used for a client (or for any entry, if the client has none yet).
export function lastRate(entries, clientId) {
  const latest = (list) =>
    list.filter((e) => e.rate !== null && e.rate !== undefined).sort((a, b) => b.start.localeCompare(a.start))[0]?.rate;
  return (clientId && latest(entries.filter((e) => e.clientId === clientId))) ?? latest(entries) ?? '';
}

// Finished, billable, client-linked time that isn't on an invoice yet.
export const isUnbilled = (entry) => entry.billable && entry.end && entry.clientId && !entry.invoiceId;

// Hours worked, rounded to 2 dp, as an invoice quantity.
export const entryHours = (entry) => Math.round((durationSeconds(entry) / 3600) * 100) / 100;

// One invoice line for an entry: "Design review (20 Oct 2026)".
export function entryInvoiceItem(entry, id) {
  const date = new Date(entry.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return {
    id,
    description: `${entry.description || 'Time'} (${date})`,
    quantity: entryHours(entry),
    rate: entry.rate ?? 0,
    taxRate: 0,
  };
}

// ---------- Date ranges for exports ----------
// A range is { from, to } as inclusive "YYYY-MM-DD" keys, plus a label and a file-name suffix.
const longDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// "2026-10" -> 1–31 October 2026.
export function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, '0')}`,
    label: new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    fileSuffix: month,
  };
}

export const customRange = (from, to) => ({
  from,
  to,
  label: from === to ? longDate(from) : `${longDate(from)} to ${longDate(to)}`,
  fileSuffix: from === to ? from : `${from}_to_${to}`,
});

// Finished entries that started within the range, oldest first. Running timers are left out.
export const entriesInRange = (entries, { from, to }) =>
  entries
    .filter((t) => t.end && entryDateKey(t) >= from && entryDateKey(t) <= to)
    .sort((a, b) => a.start.localeCompare(b.start));
