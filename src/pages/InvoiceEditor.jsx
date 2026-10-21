import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Download, Pencil, Plus, Save, Search, Settings, SlidersHorizontal, Trash, X } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { newId } from '../data/seed';
import { addDays, fromKey, todayKey, toKey } from '../utils/date';
import { invoiceTotals, lineAmount, nextInvoiceNumber, TERMS_OPTIONS, withInvoiceVat } from '../utils/invoices';
import { defaultInvoiceVat, formatVatRate, percentToRate, vatOptions } from '../utils/vat';
import { formatNumber } from '../utils/money';
import './InvoiceEditor.css';

const blankItem = () => ({ id: newId(), description: '', quantity: 1, rate: 0, taxRate: 0 });

// fromTime (router state from Time Tracking) prefills the client and one line per time entry.
function blankInvoice(invoices, fromTime, vatRate) {
  const invoice = {
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
    vatRate, // null = no VAT, '' = still to choose (variable rate), or a rate
  };
  return fromTime ? { ...invoice, client: fromTime.client, items: fromTime.items } : invoice;
}

export default function InvoiceEditor() {
  const { id } = useParams();
  const { invoices, clients, saveInvoice, deleteInvoices } = useAppData();
  const existing = id ? invoices.find((i) => i.id === id) : null;
  const navigate = useNavigate();
  const location = useLocation();
  const fromTime = id ? null : location.state?.fromTime; // { client, items, timeEntryIds }
  const { sender, vatRegistered, vatRate: profileVatRate } = useAuth();
  // Older per-line-tax invoices switch to a single VAT line when opened for editing.
  const [invoice, setInvoice] = useState(() =>
    existing ? withInvoiceVat(existing) : blankInvoice(invoices, fromTime, defaultInvoiceVat({ vatRegistered, vatRate: profileVatRate })),
  );
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

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
    if (invoice.vatRate === '') return setError('Choose a VAT rate for this invoice.');
    saveInvoice(
      { ...invoice, client: invoice.client.trim(), dueDate: invoice.dueDate || invoice.date },
      { timeEntryIds: fromTime?.timeEntryIds },
    );
    navigate(`/invoices/${invoice.id}`); // show the saved invoice's preview
  };

  // Downloads what's in the form right now, saved or not.
  const download = async () => {
    setDownloading(true);
    try {
      const { downloadInvoicePdf } = await import('../components/pdf/downloadInvoicePdf');
      await downloadInvoicePdf(
        { ...invoice, client: invoice.client.trim() || 'Customer' },
        sender,
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
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => {
            const amount = lineAmount(item);
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
        <button type="button" className="btn btn--green no-print" onClick={addLine}>
          <Plus size={16} strokeWidth={1.8} /> Add another line
        </button>

        <section className="totals">
          <div>
            <span>Sub Total</span>
            <span>{formatNumber(totals.subTotal)}</span>
          </div>
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
          {/* Always shown: businesses that aren't VAT registered default to No VAT (R0.00). */}
          <div>
            <VatPicker
              value={invoice.vatRate}
              profileRate={profileVatRate}
              onChange={(vatRate) => {
                setError('');
                setInvoice((inv) => ({ ...inv, vatRate }));
              }}
            />
            <span>{formatNumber(totals.tax)}</span>
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

// The VAT line's rate picker: preset rates, another rate, or no VAT.
// value: a rate, null (no VAT) or '' (not chosen yet).
function VatPicker({ value, profileRate, onChange }) {
  const options = vatOptions(profileRate);
  const isPreset = typeof value === 'number' && options.some((o) => o.value === value);
  const [other, setOther] = useState(typeof value === 'number' && !isPreset ? formatVatRate(value).replace('%', '') : '');
  const [choosingOther, setChoosingOther] = useState(typeof value === 'number' && !isPreset);
  const selected = choosingOther ? 'other' : value === null ? 'none' : value === '' ? '' : String(value);

  const pick = (e) => {
    const v = e.target.value;
    setChoosingOther(v === 'other');
    if (v === 'other') onChange(percentToRate(other) ?? '');
    else if (v === 'none') onChange(null);
    else if (v === '') onChange('');
    else onChange(Number(v));
  };

  return (
    <span className="vat-picker">
      VAT
      <select value={selected} onChange={pick} aria-label="VAT rate">
        {selected === '' && <option value="">Choose rate…</option>}
        {options.map((o) => (
          <option key={o.value} value={String(o.value)}>
            {o.label}
          </option>
        ))}
        <option value="other">Another rate…</option>
        <option value="none">No VAT</option>
      </select>
      {choosingOther && (
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={other}
          placeholder="%"
          aria-label="VAT rate (%)"
          onChange={(e) => {
            setOther(e.target.value);
            onChange(percentToRate(e.target.value) ?? '');
          }}
        />
      )}
    </span>
  );
}
