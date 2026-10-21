// Builds a month's timesheet as a real Excel (.xlsx) file, in the browser.
// Sheet 1 "Timesheet": one row per finished entry, plus totals. Sheet 2 "By client": hours and amounts.
import writeXlsxFile from 'write-excel-file/browser';
import { durationSeconds, entryAmount, entryDateKey, timeOfDay } from '../utils/time';

const HOURS = '0.00';
const MONEY = '#,##0.00';
const bold = (value) => ({ value, fontWeight: 'bold' });
const num = (value, format, extra) => ({ value, type: Number, format, ...extra });

const monthName = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

// Finished entries in the month ("YYYY-MM"), oldest first. Running timers are left out.
export const monthEntries = (month, entries) =>
  entries
    .filter((t) => t.end && entryDateKey(t).startsWith(month))
    .sort((a, b) => a.start.localeCompare(b.start));

const hoursOf = (entry) => Math.round((durationSeconds(entry) / 3600) * 100) / 100;

/** Returns { blob, fileName } for the month's timesheet. */
export async function buildTimesheetXlsx(month, { entries, clients, invoices, ownerName }) {
  const rows = monthEntries(month, entries);
  const clientName = (id) => clients.find((c) => c.id === id)?.name ?? '';
  const invoiceNumber = (id) => invoices.find((i) => i.id === id)?.number ?? '';
  const title = `Timesheet – ${monthName(month)}${ownerName ? ` – ${ownerName}` : ''}`;

  // ---- Sheet 1: every entry ----
  const header = ['Date', 'Day', 'Start', 'End', 'Hours', 'Client', 'Description', 'Billable', 'Rate (R/h)', 'Amount (R)', 'Invoice'];
  const entryRows = rows.map((t) => {
    const [y, m, d] = entryDateKey(t).split('-').map(Number);
    const day = new Date(y, m - 1, d);
    return [
      // UTC midnight so Excel shows the same calendar day in every timezone.
      { value: new Date(Date.UTC(y, m - 1, d)), type: Date, format: 'yyyy-mm-dd' },
      day.toLocaleDateString('en-GB', { weekday: 'short' }),
      timeOfDay(t.start),
      timeOfDay(t.end),
      num(hoursOf(t), HOURS),
      clientName(t.clientId),
      t.description,
      t.billable ? 'Yes' : 'No',
      t.rate === null || t.rate === undefined ? null : num(t.rate, MONEY),
      num(Math.round(entryAmount(t) * 100) / 100, MONEY),
      t.invoiceId ? invoiceNumber(t.invoiceId) : '',
    ];
  });
  const totalHours = rows.reduce((s, t) => s + hoursOf(t), 0);
  const totalAmount = rows.reduce((s, t) => s + entryAmount(t), 0);
  const timesheet = [
    [bold(title)],
    [],
    header.map(bold),
    ...entryRows,
    [],
    [bold('Total'), null, null, null, num(Math.round(totalHours * 100) / 100, HOURS, { fontWeight: 'bold' }), null, null, null, null, num(Math.round(totalAmount * 100) / 100, MONEY, { fontWeight: 'bold' }), null],
  ];

  // ---- Sheet 2: per client ----
  const byClient = new Map();
  rows.forEach((t) => {
    const name = clientName(t.clientId) || 'No client';
    const c = byClient.get(name) ?? { hours: 0, billable: 0, amount: 0 };
    c.hours += hoursOf(t);
    if (t.billable) c.billable += hoursOf(t);
    c.amount += entryAmount(t);
    byClient.set(name, c);
  });
  const clientRows = [...byClient.entries()]
    .sort((a, b) => b[1].hours - a[1].hours)
    .map(([name, c]) => [name, num(round2(c.hours), HOURS), num(round2(c.billable), HOURS), num(round2(c.amount), MONEY)]);
  const summary = [
    [bold(title)],
    [],
    ['Client', 'Hours', 'Billable hours', 'Amount (R)'].map(bold),
    ...clientRows,
    [],
    [
      bold('Total'),
      num(round2(totalHours), HOURS, { fontWeight: 'bold' }),
      num(round2(rows.filter((t) => t.billable).reduce((s, t) => s + hoursOf(t), 0)), HOURS, { fontWeight: 'bold' }),
      num(round2(totalAmount), MONEY, { fontWeight: 'bold' }),
    ],
  ];

  const blob = await writeXlsxFile([
    {
      sheet: 'Timesheet',
      data: timesheet,
      stickyRowsCount: 3,
      columns: [12, 6, 7, 7, 8, 22, 40, 9, 11, 13, 12].map((width) => ({ width })),
    },
    {
      sheet: 'By client',
      data: summary,
      stickyRowsCount: 3,
      columns: [28, 10, 14, 14].map((width) => ({ width })),
    },
  ]).toBlob();

  return { blob, fileName: `Planosaur-timesheet-${month}.xlsx` };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
