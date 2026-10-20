import { addDays, startOfWeek, toKey } from './date';
import { invoiceTotals } from './invoices';

export const CHART_MONTHS = 6;

const isPaidIncome = (invoice) => invoice.type === 'invoice' && invoice.status === 'paid' && !invoice.archived;

// Money in and out as { date, amount } entries, so both sides are bucketed the same way.
export const incomeEntries = (invoices) =>
  invoices.filter((i) => isPaidIncome(i) && i.date).map((i) => ({ date: i.date, amount: invoiceTotals(i).total }));

export const expenseEntries = (expenses) =>
  expenses.filter((e) => e.date).map((e) => ({ date: e.date, amount: Number(e.amount) || 0 }));

// The chart window: the first of the month (months - 1) months back, through today.
export function windowStart(months = CHART_MONTHS, today = new Date()) {
  return new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
}

const sumBetween = (entries, fromKey, toKey) =>
  entries.reduce((sum, e) => (e.date >= fromKey && e.date <= toKey ? sum + e.amount : sum), 0);

export function netForWindow(invoices, expenses, months = CHART_MONTHS, today = new Date()) {
  const from = toKey(windowStart(months, today));
  const to = toKey(today);
  return sumBetween(incomeEntries(invoices), from, to) - sumBetween(expenseEntries(expenses), from, to);
}

// One point per week. Lines show a rolling four-week total so they sit on the same scale as the
// monthly bars, which are drawn on the week each month begins. Values are in thousands.
export function buildChartData(invoices, expenses, months = CHART_MONTHS, today = new Date()) {
  const income = incomeEntries(invoices);
  const expense = expenseEntries(expenses);
  const start = windowStart(months, today);
  const todayKey = toKey(today);

  const monthTotals = Array.from({ length: months }, (_, m) => {
    const first = new Date(start.getFullYear(), start.getMonth() + m, 1);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    return {
      month: first.getMonth(),
      name: first.toLocaleDateString('en-US', { month: 'long' }),
      income: sumBetween(income, toKey(first), toKey(last)),
      expense: sumBetween(expense, toKey(first), toKey(last)),
    };
  });

  const points = [];
  let monthIndex = 0;
  for (let week = startOfWeek(start); toKey(week) <= todayKey; week = addDays(week, 7)) {
    const weekEnd = toKey(addDays(week, 6));
    const rollingFrom = toKey(addDays(week, -21));
    // A month starts in this week when the week runs into the next month we haven't placed yet.
    const totals = monthTotals[monthIndex];
    const startsMonth = totals && (points.length === 0 || addDays(week, 6).getMonth() === totals.month);
    if (startsMonth) monthIndex += 1;
    points.push({
      index: points.length,
      label: startsMonth ? totals.name : '',
      income: sumBetween(income, rollingFrom, weekEnd) / 1000,
      expense: sumBetween(expense, rollingFrom, weekEnd) / 1000,
      incomeBar: startsMonth ? totals.income / 1000 : null,
      expenseBar: startsMonth ? totals.expense / 1000 : null,
    });
  }

  const isEmpty = monthTotals.every((t) => t.income === 0 && t.expense === 0);
  return { points, isEmpty };
}
