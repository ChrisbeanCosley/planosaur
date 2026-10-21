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
