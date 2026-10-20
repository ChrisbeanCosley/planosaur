import { useState } from 'react';
import { Paperclip, Plus } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import ExpenseFormModal from '../components/ExpenseFormModal';
import FilterMenu from '../components/FilterMenu';
import SearchToggle from '../components/SearchToggle';
import { EXPENSE_CATEGORIES, toOptions } from '../data/categories';
import { formatLongDate, fromKey, toKey } from '../utils/date';
import { formatMoney } from '../utils/money';
import './Expenses.css';

// Each period is a [from, to] range of date keys (inclusive); null means open-ended.
function periodRange(period, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case 'month':
      return [toKey(new Date(y, m, 1)), toKey(new Date(y, m + 1, 0))];
    case 'lastMonth':
      return [toKey(new Date(y, m - 1, 1)), toKey(new Date(y, m, 0))];
    case 'year':
      return [toKey(new Date(y, 0, 1)), toKey(new Date(y, 11, 31))];
    default:
      return [null, null];
  }
}

const PERIODS = [
  { id: 'month', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
];

export default function Expenses() {
  const { expenses, expensesMissing, receipts } = useAppData();
  const [period, setPeriod] = useState('month');
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); // expense being edited, 'new', or null

  const [from, to] = periodRange(period);
  const q = query.trim().toLowerCase();
  const rows = expenses
    .filter(
      (e) =>
        (!from || e.date >= from) &&
        (!to || e.date <= to) &&
        (categories.length === 0 || categories.includes(e.category)) &&
        (!q || `${e.payee} ${e.description}`.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const total = rows.reduce((sum, e) => sum + e.amount, 0);

  // How many receipts each expense has, for the paperclip column.
  const receiptCounts = {};
  receipts.forEach((r) => {
    receiptCounts[r.expenseId] = (receiptCounts[r.expenseId] ?? 0) + 1;
  });
  const byCategory = Object.entries(EXPENSE_CATEGORIES)
    .map(([value, meta]) => ({
      value,
      ...meta,
      amount: rows.filter((e) => e.category === value).reduce((sum, e) => sum + e.amount, 0),
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const stats = [
    { label: 'Total spent', value: formatMoney(total) },
    { label: 'Expenses', value: rows.length },
    { label: 'Average expense', value: formatMoney(rows.length ? total / rows.length : 0) },
    { label: 'Top category', value: byCategory[0] ? byCategory[0].label : '—' },
  ];

  return (
    <div className="expenses">
      <h1 className="page-title">Expenses</h1>

      {expensesMissing && (
        <div className="card expenses__setup">
          <strong>One more database step</strong>
          <p>
            Run <code>supabase/migrations/0003_expenses.sql</code> in the Supabase SQL Editor, then refresh this page to
            start adding expenses.
          </p>
        </div>
      )}

      <div className="toolbar expenses__toolbar">
        <nav className="expenses__tabs" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" className={p.id === period ? 'is-active' : ''} onClick={() => setPeriod(p.id)}>
              {p.label}
            </button>
          ))}
        </nav>
        <div className="toolbar__actions">
          <SearchToggle value={query} onChange={setQuery} placeholder="Payee or description" />
          <button type="button" className="btn btn--green" onClick={() => setEditing('new')} disabled={expensesMissing}>
            <Plus size={16} strokeWidth={1.8} />
            Add Expense
          </button>
          <FilterMenu
            title="Categories"
            options={toOptions(EXPENSE_CATEGORIES)}
            selected={categories}
            onChange={setCategories}
          />
        </div>
      </div>

      <section className="expenses__stats">
        {stats.map((s) => (
          <div key={s.label}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </section>

      {byCategory.length > 0 && (
        <section className="card expenses__breakdown" aria-label="Spending by category">
          <h2 className="card__title">Spending by category</h2>
          {byCategory.map((c) => (
            <div key={c.value} className="expenses__bar-row">
              <span className="expenses__bar-label">
                <i style={{ background: c.color }} />
                {c.label}
              </span>
              <span className="expenses__bar-track">
                <span style={{ width: `${(c.amount / total) * 100}%`, background: c.color }} />
              </span>
              <span className="expenses__bar-amount">{formatMoney(c.amount)}</span>
            </div>
          ))}
        </section>
      )}

      <table className="expenses__table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Paid to</th>
            <th>Description</th>
            <th>Category</th>
            <th className="expenses__receipt-col">
              <Paperclip size={13} strokeWidth={1.8} aria-label="Receipts" />
            </th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="empty-state">
                No expenses for this period.
              </td>
            </tr>
          )}
          {rows.map((expense) => {
            const category = EXPENSE_CATEGORIES[expense.category] ?? EXPENSE_CATEGORIES.other;
            return (
              <tr key={expense.id} onClick={() => setEditing(expense)} title="Edit expense">
                <td>{formatLongDate(fromKey(expense.date))}</td>
                <td>{expense.payee}</td>
                <td className="expenses__muted">{expense.description || '—'}</td>
                <td>
                  <span className="expenses__category">
                    <i style={{ background: category.color }} />
                    {category.label}
                  </span>
                </td>
                <td className="expenses__receipt-col">
                  {receiptCounts[expense.id] ? (
                    <span className="expenses__receipts" title={`${receiptCounts[expense.id]} receipt(s) attached`}>
                      <Paperclip size={12} strokeWidth={1.8} />
                      {receiptCounts[expense.id]}
                    </span>
                  ) : (
                    <span className="expenses__no-receipt" title="No receipt attached">
                      —
                    </span>
                  )}
                </td>
                <td>{formatMoney(expense.amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editing && (
        <ExpenseFormModal
          key={editing === 'new' ? 'new' : editing.id}
          expense={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
