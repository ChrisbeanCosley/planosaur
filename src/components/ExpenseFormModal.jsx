import { useEffect, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Paperclip, X } from 'lucide-react';
import Modal, { FormRow } from './Modal';
import { useAppData } from '../context/AppDataContext';
import { EXPENSE_CATEGORIES } from '../data/categories';
import { newId } from '../data/seed';
import { receiptUrls, RECEIPT_MAX_BYTES, RECEIPT_TYPES } from '../lib/api';
import { todayKey } from '../utils/date';
import './ExpenseFormModal.css';

const fileType = (file) => file.type || (/\.hei[cf]$/i.test(file.name) ? 'image/heic' : '');
// Browsers can't draw HEIC (iPhone) photos, so those get an icon instead of a thumbnail.
const canPreview = (type) => ['image/png', 'image/jpeg', 'image/webp'].includes(type);

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Adds a new expense, or edits `expense` when one is passed. Saves the expense first,
// then uploads any receipts that were attached.
export default function ExpenseFormModal({ expense, onClose }) {
  const { expenses, receipts, receiptsMissing, addExpense, updateExpense, deleteExpense, addReceipt, removeReceipt } =
    useAppData();
  const editing = Boolean(expense);
  const [id] = useState(() => expense?.id ?? newId());
  const [form, setForm] = useState({
    date: expense?.date ?? todayKey(),
    payee: expense?.payee ?? '',
    description: expense?.description ?? '',
    category: expense?.category ?? 'software',
    amount: expense?.amount ?? '',
  });
  const [pending, setPending] = useState([]); // files chosen but not uploaded yet
  const [removed, setRemoved] = useState([]); // saved receipts to delete on save
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const saved = receipts.filter((r) => r.expenseId === id && !removed.includes(r.id));

  const addFiles = (files) => {
    setError('');
    const accepted = [];
    for (const file of files) {
      if (!RECEIPT_TYPES.includes(fileType(file))) {
        setError(`${file.name}: only photos (JPG, PNG, WebP, HEIC) and PDFs can be attached.`);
      } else if (file.size > RECEIPT_MAX_BYTES) {
        setError(`${file.name} is larger than 10 MB.`);
      } else {
        accepted.push({ key: newId(), file, type: fileType(file), previewUrl: URL.createObjectURL(file) });
      }
    }
    setPending((p) => [...p, ...accepted]);
  };

  // Free the local previews when the form closes.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const values = {
        ...form,
        id,
        payee: form.payee.trim(),
        description: form.description.trim(),
        amount: Number(form.amount) || 0,
      };
      // After a failed upload the expense already exists, so retrying updates it instead.
      const exists = expenses.some((x) => x.id === id);
      await (exists ? updateExpense(id, values) : addExpense(values));

      for (const receiptId of removed) {
        const receipt = receipts.find((r) => r.id === receiptId);
        if (receipt) await removeReceipt(receipt);
      }
      setRemoved([]);

      for (const item of pending) {
        await addReceipt(id, item.file);
        setPending((p) => p.filter((x) => x.key !== item.key));
        URL.revokeObjectURL(item.previewUrl);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!window.confirm(`Delete the ${expense.payee} expense and its receipts?`)) return;
    deleteExpense(id);
    onClose();
  };

  return (
    <Modal title={editing ? 'Edit Expense' : 'Add Expense'} onClose={busy ? () => {} : onClose}>
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

        <Receipts
          saved={saved}
          pending={pending}
          disabled={busy}
          unavailable={receiptsMissing}
          onAdd={addFiles}
          onRemoveSaved={(r) => setRemoved((ids) => [...ids, r.id])}
          onRemovePending={(item) => {
            URL.revokeObjectURL(item.previewUrl);
            setPending((p) => p.filter((x) => x.key !== item.key));
          }}
        />

        {error && (
          <p className="receipts__error" role="alert">
            {error}
          </p>
        )}

        <div className="modal__actions">
          {editing && (
            <button type="button" className="btn btn--danger modal__delete" onClick={remove} disabled={busy}>
              Delete
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? (pending.length ? 'Uploading…' : 'Saving…') : editing ? 'Save changes' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Receipts({ saved, pending, disabled, unavailable, onAdd, onRemoveSaved, onRemovePending }) {
  const fileInput = useRef(null);
  const [urls, setUrls] = useState({});
  const [dragging, setDragging] = useState(false);

  // Private files are opened through short-lived signed links. Re-fetched only when the
  // set of files changes (pathsKey), not on every render.
  const pathsKey = saved.map((r) => r.path).join('|');
  useEffect(() => {
    let cancelled = false;
    receiptUrls(pathsKey ? pathsKey.split('|') : [])
      .then((map) => !cancelled && setUrls(map))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathsKey]);

  if (unavailable) {
    return (
      <div className="receipts">
        <span className="receipts__label">Receipts</span>
        <p className="receipts__note">
          To attach receipts, run <code>supabase/migrations/0005_expense_receipts.sql</code> in Supabase first.
        </p>
      </div>
    );
  }

  const items = [
    ...saved.map((r) => ({ key: r.id, name: r.fileName, size: r.size, type: r.mimeType, url: urls[r.path], onRemove: () => onRemoveSaved(r) })),
    ...pending.map((p) => ({
      key: p.key,
      name: p.file.name,
      size: p.file.size,
      type: p.type,
      url: p.previewUrl,
      isNew: true,
      onRemove: () => onRemovePending(p),
    })),
  ];

  return (
    <div
      className={`receipts${dragging ? ' receipts--dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) onAdd([...e.dataTransfer.files]);
      }}
    >
      <span className="receipts__label">Receipts</span>

      {items.length > 0 && (
        <ul className="receipts__list">
          {items.map((item) => (
            <li key={item.key} className="receipts__item">
              <a
                className="receipts__thumb"
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${item.name}`}
                onClick={(e) => !item.url && e.preventDefault()}
              >
                {canPreview(item.type) && item.url ? (
                  <img src={item.url} alt="" />
                ) : item.type === 'application/pdf' ? (
                  <FileText size={18} strokeWidth={1.6} />
                ) : (
                  <ImageIcon size={18} strokeWidth={1.6} />
                )}
              </a>
              <div className="receipts__meta">
                <a href={item.url} target="_blank" rel="noreferrer" onClick={(e) => !item.url && e.preventDefault()}>
                  {item.name}
                </a>
                <span>
                  {formatSize(item.size)}
                  {item.isNew && ' · uploads when you save'}
                </span>
              </div>
              <button
                type="button"
                className="icon-button receipts__remove"
                onClick={item.onRemove}
                disabled={disabled}
                aria-label={`Remove ${item.name}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif,application/pdf"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          onAdd([...e.target.files]);
          e.target.value = '';
        }}
      />
      <button type="button" className="receipts__add" onClick={() => fileInput.current?.click()} disabled={disabled}>
        <Paperclip size={14} strokeWidth={1.8} />
        Attach receipt <span>photo or PDF, up to 10 MB · or drop files here</span>
      </button>
    </div>
  );
}
