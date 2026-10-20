import { useState } from 'react';
import Modal, { FormRow } from './Modal';
import { EXPENSE_CATEGORIES } from '../data/categories';
import { todayKey } from '../utils/date';

// Adds a new expense, or edits `expense` when one is passed (then onDelete is shown too).
export default function ExpenseFormModal({ expense, onSave, onDelete, onClose }) {
  const editing = Boolean(expense);
  const [form, setForm] = useState({
    date: expense?.date ?? todayKey(),
    payee: expense?.payee ?? '',
    description: expense?.description ?? '',
    category: expense?.category ?? 'software',
    amount: expense?.amount ?? '',
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      payee: form.payee.trim(),
      description: form.description.trim(),
      amount: Number(form.amount) || 0,
    });
    onClose();
  };

  const remove = () => {
    if (!window.confirm(`Delete the ${expense.payee} expense?`)) return;
    onDelete();
    onClose();
  };

  return (
    <Modal title={editing ? 'Edit Expense' : 'Add Expense'} onClose={onClose}>
      <form onSubmit={submit}>
        <FormRow label="Paid to">
          <input className="field" required value={form.payee} onChange={set('payee')} placeholder="e.g. Adobe" autoFocus />
        </FormRow>
        <FormRow label="Description (optional)">
          <input className="field" value={form.description} onChange={set('description')} />
        </FormRow>
        <div className="form-row-group">
          <FormRow label="Category">
            <select className="field" value={form.category} onChange={set('category')}>
              {Object.entries(EXPENSE_CATEGORIES).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Date">
            <input className="field" type="date" required value={form.date} onChange={set('date')} />
          </FormRow>
        </div>
        <FormRow label="Amount (R)">
          <input
            className="field"
            type="number"
            required
            min="0"
            step="0.01"
            value={form.amount}
            onChange={set('amount')}
            placeholder="0.00"
          />
        </FormRow>
        <div className="modal__actions">
          {editing && (
            <button type="button" className="btn btn--danger modal__delete" onClick={remove}>
              Delete
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn">
            {editing ? 'Save changes' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
