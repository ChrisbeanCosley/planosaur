import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Download, Pencil, Plus, Save, Search, Settings, SlidersHorizontal, Trash, X } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { newId } from '../data/seed';
import { addDays, fromKey, todayKey, toKey } from '../utils/date';
import { invoiceTotals, nextInvoiceNumber, TAX_OPTIONS, TERMS_OPTIONS } from '../utils/invoices';
import { formatNumber } from '../utils/money';
import './InvoiceEditor.css';

const blankItem = () => ({ id: newId(), description: '', quantity: 1, rate: 0, taxRate: 0 });

function blankInvoice(invoices) {
  return {
    id: newId(),
    number: nextInvoiceNumber(invoices),
    client: '',
    orderNumber: '',
    date: todayKey(),
    reference: '',
    dueDate: '',
    terms: '',
    subject: '',
    items: [blankItem()],
    discount: 0,
    status: 'unpaid',
    type: 'invoice',
    archived: false,
    recurring: false,
  };
}

export default function InvoiceEditor() {
  const { id } = useParams();
  const { invoices, clients, saveInvoice, deleteInvoices } = useAppData();
  const existing = id ? invoices.find((i) => i.id === id) : null;
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(() => existing ?? blankInvoice(invoices));
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const { name, user } = useAuth();

  if (id && !existing) return <Navigate to="/invoices" replace />;

  const set = (key) => (e) => setInvoice((inv) => ({ ...inv, [key]: e.target.value }));

  const setTerms = (e) => {
    const terms = TERMS_OPTIONS.find((t) => t.value === e.target.value);
    setInvoice((inv) => ({
      ...inv,
      terms: terms.value,
      dueDate: terms.days === null ? inv.dueDate : toKey(addDays(fromKey(inv.date), terms.days)),
    }));
  };

  const setItem = (itemId, key, value) =>
    setInvoice((inv) => ({
      ...inv,
      items: inv.items.map((item) => (item.id === itemId ? { ...item, [key]: value } : item)),
    }));

  const addLine = () => setInvoice((inv) => ({ ...inv, items: [...inv.items, blankItem()] }));
  const removeLine = (itemId) => setInvoice((inv) => ({ ...inv, items: inv.items.filter((i) => i.id !== itemId) }));

  const totals = invoiceTotals(invoice);

  const save = () => {
    if (!invoice.client.trim()) return setError('Please select a customer.');
    if (!invoice.items.some((i) => i.description.trim())) return setError('Add at least one item.');
    saveInvoice({ ...invoice, client: invoice.client.trim(), dueDate: invoice.dueDate || invoice.date });
    navigate(`/invoices/${invoice.id}`); // show the saved invoice's preview
  };

  // Downloads what's in the form right now, saved or not.
  const download = async () => {
    setDownloading(true);
    try {
      const { downloadInvoicePdf } = await import('../components/pdf/downloadInvoicePdf');
      await downloadInvoicePdf(
        { ...invoice, client: invoice.client.trim() || 'Customer' },
        { name, email: user?.email },
      );
    } finally {
      setDownloading(false);
    }
  };

  const remove = () => {
    if (!window.confirm(`Delete ${invoice.number}? This can't be undone.`)) return;
    if (existing) deleteInvoices([existing.id]);
    navigate('/invoices');
  };

  return (
    <div className="invoice-editor">
      <header className="page-header invoice-editor__header">
        <h1 className="page-title">{existing ? `Edit ${existing.number}` : 'New Invoice'}</h1>
        <div className="invoice-editor__actions no-print">
          <button type="button" className="btn btn--pink" onClick={download} disabled={downloading}>
            <Download size={15} strokeWidth={1.8} /> {downloading ? 'Preparing…' : 'Download Invoice'}
          </button>
          <button type="button" className="btn btn--danger" onClick={remove}>
            <Trash size={15} strokeWidth={1.8} /> Delete Invoice
          </button>
          <button type="button" className="btn" onClick={save}>
            <Save size={15} strokeWidth={1.8} /> Save Invoice
          </button>
          <button
            type="button"
            className="btn btn--green"
            onClick={() => window.alert('Invoice templates are coming soon.')}
          >
            <Pencil size={15} strokeWidth={1.8} /> Edit Invoice Template
          </button>
          <button type="button" className="icon-button" aria-label="Invoice options">
            <SlidersHorizontal size={21} strokeWidth={1.4} />
          </button>
        </div>
      </header>

      {error && <p className="invoice-editor__error">{error}</p>}

      <div className="invoice-form">
        <label htmlFor="client">Customer Name</label>
        <div className="invoice-form__wide">
          <input
            id="client"
            className="field"
            list="client-list"
            value={invoice.client}
            onChange={(e) => {
              setError('');
              set('client')(e);
            }}
            placeholder="Select Customer"
          />
          <datalist id="client-list">
            {clients.map(({ name: c }) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Search size={17} strokeWidth={1.8} className="invoice-form__icon" />
        </div>

        <label htmlFor="number">Invoice No.</label>
        <div className="invoice-form__wide">
          <input id="number" className="field" value={invoice.number} onChange={set('number')} />
          <Settings size={17} className="invoice-form__icon" fill="#666" stroke="#fff" />
        </div>

        <label htmlFor="order">Order No.</label>
        <div className="invoice-form__wide">
          <input id="order" className="field" value={invoice.orderNumber} onChange={set('orderNumber')} />
        </div>

        <label htmlFor="date">Invoice Date</label>
        <div className="invoice-form__pair">
          <input id="date" type="date" className="field" value={invoice.date} onChange={set('date')} />
          <label htmlFor="reference">Reference</label>
          <input id="reference" className="field" value={invoice.reference} onChange={set('reference')} />
        </div>

        <label htmlFor="due">Due Date</label>
        <div className="invoice-form__pair">
          <input id="due" type="date" className="field" value={invoice.dueDate} onChange={set('dueDate')} />
          <label htmlFor="terms">Terms</label>
          <select id="terms" className="field" value={invoice.terms} onChange={setTerms}>
            {TERMS_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <label htmlFor="subject">Subject</label>
        <div className="invoice-form__wide">
          <input id="subject" className="field" value={invoice.subject} onChange={set('subject')} />
        </div>
      </div>

      <table className="items-table">
        <thead>
          <tr>
            <th>Item Details</th>
            <th>Quantity</th>
            <th>Rate</th>
            <th>Tax</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => {
            const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0) * (1 + Number(item.taxRate));
            return (
              <tr key={item.id}>
                <td>
                  <input
                    value={item.description}
                    onChange={(e) => {
                      setError('');
                      setItem(item.id, 'description', e.target.value);
                    }}
                    placeholder="Type or click to select an item"
                    aria-label="Item details"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => setItem(item.id, 'quantity', e.target.value)}
                    aria-label="Quantity"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => setItem(item.id, 'rate', e.target.value)}
                    aria-label="Rate"
                  />
                </td>
                <td>
                  <select
                    value={item.taxRate}
                    onChange={(e) => setItem(item.id, 'taxRate', Number(e.target.value))}
                    aria-label="Tax"
                  >
                    {TAX_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.value === 0 && !item.taxRate ? 'Select a Tax' : t.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="items-table__amount">
                  {formatNumber(amount)}
                  {invoice.items.length > 1 && (
                    <button
                      type="button"
                      className="icon-button items-table__remove no-print"
                      onClick={() => removeLine(item.id)}
                      aria-label="Remove line"
                    >
                      <X size={12} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="invoice-editor__bottom">
        <button type="button" className="btn no-print" onClick={addLine}>
          <Plus size={16} strokeWidth={1.8} /> Add another line
        </button>

        <section className="totals">
          <div>
            <span>Sub Total</span>
            <span>{formatNumber(totals.subTotal)}</span>
          </div>
          {totals.tax > 0 && (
            <div>
              <span>Tax</span>
              <span>{formatNumber(totals.tax)}</span>
            </div>
          )}
          <div>
            <span>Discount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={invoice.discount}
              onChange={set('discount')}
              aria-label="Discount"
            />
          </div>
          <div className="totals__total">
            <span>Total</span>
            <span>{formatNumber(totals.total)}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
