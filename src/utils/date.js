export const DAY_LABELS = ['MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT', 'SUN'];

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Weeks start on Monday, matching the designs.
export function startOfWeek(date) {
  const d = startOfDay(date);
  const offset = (d.getDay() + 6) % 7;
  return addDays(d, -offset);
}

// Dates are stored as "YYYY-MM-DD" keys so they're timezone-safe and easy to compare.
export function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayKey = () => toKey(new Date());

export function diffInDays(a, b) {
  return Math.round((startOfDay(a) - startOfDay(b)) / 86400000);
}

export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export const formatMonthYear = (date) =>
  date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

// e.g. "03 Dec 2021"
export const formatLongDate = (date) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// e.g. "Sep 11"
export const formatShortDate = (date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// "This week", or a range like "Oct 12 – 18" / "Sep 28 – Oct 4".
export function weekLabel(weekStart) {
  if (toKey(startOfWeek(new Date())) === toKey(weekStart)) return 'This week';
  const end = addDays(weekStart, 6);
  const endText = end.getMonth() === weekStart.getMonth() ? end.getDate() : formatShortDate(end);
  return `${formatShortDate(weekStart)} – ${endText}`;
}
