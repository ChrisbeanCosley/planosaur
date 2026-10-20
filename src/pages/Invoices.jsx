import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ellipsis, Plus } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import FilterMenu from '../components/FilterMenu';
import SearchToggle from '../components/SearchToggle';
import { formatLongDate, fromKey } from '../utils/date';
import { balanceDue, daysUntilDue, invoiceStatus, invoiceTotals, isOpen } from '../utils/invoices';
import { formatMoney } from '../utils/money';
import './Invoices.css';

const TABS = [
  { id: 'all', label: 'All Invoices', test: (i) => i.type === 'invoice' && !i.archived },
  { id: 'due', label: 'Due', test: (i) => isOpen(i) && daysUntilDue(i) >= 0 },
  { id: 'paid', label: 'Paid', test: (i) => i.type === 'invoice' && !i.archived && i.status === 'paid' },
  { id: 'unpaid', label: 'Unpaid', test: (i) => isOpen(i) },
  { id: 'draft', label: 'Draft', test: (i) => i.type === 'invoice' && !i.archived && i.status === 'draft' },
  { id: 'archived', label: 'Archived', test: (i) => i.archived },
  { id: 'estimates', label: 'Estimates', test: (i) => i.type === 'estimate' && !i.archived },
  { id: 'recurring', label: 'Recurring Invoices', test: (i) => i.recurring && !i.archived },
];

function useStats(invoices) {
  const open = invoices.filter(isOpen);
  const sum = (list) => list.reduce((total, i) => total + balanceDue(i), 0);
  const issued = invoices.filter((i) => i.type === 'invoice' && i.status !== 'draft' && i.dueDate);
  const avgDays = issued.length
    ? Math.round(issued.reduce((t, i) => t + (fromKey(i.dueDate) - fromKey(i.date)) / 86400000, 0) / issued.length)
    : 0;

  return [
    { label: 'Total Outstanding receivables', value: formatMoney(sum(open)) },
    { label: 'Due Today', value: formatMoney(sum(open.filter((i) => daysUntilDue(i) === 0))) },
    { label: 'Due Within 30 Days', value: formatMoney(sum(open.filter((i) => daysUntilDue(i) >= 0 && daysUntilDue(i) <= 30))) },
    { label: 'Overdue Invoices', value: formatMoney(sum(open.filter((i) => daysUntilDue(i) < 0))) },
    { label: 'Average No. of Days Until Payment', value: `${avgDays} Days` },
  ];
}

export default function Invoices() {
  const { invoices, clients: clientList, updateInvoices, deleteInvoices } = useAppData();
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState([]);
  const stats = useStats(invoices);

  const q = query.trim().toLowerCase();
  const activeTab = TABS.find((t) => t.id === tab);
  const rows = invoices
    .filter(activeTab.test)
    .filter((i) => !q || `${i.client} ${i.number}`.toLowerCase().includes(q))
    .filter((i) => clients.length === 0 || clients.includes(i.client))
    .sort((a, b) => b.date.localeCompare(a.date));

  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const toggleRow = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected(allSelected ? [] : rows.map((r) => r.id));

  const runBulk = (action) => {
    if (action === 'paid') updateInvoices(selected, { status: 'paid' });
    if (action === 'archive') updateInvoices(selected, { archived: true });
    if (action === 'restore') updateInvoices(selected, { archived: false });
    if (action === 'delete') {
      if (!window.confirm(`Delete ${selected.length} invoice(s)? This can't be undone.`)) return;
      deleteInvoices(selected);
    }
    setSelected([]);
  };

  return (
    <div className="invoices">
      <h1 className="page-title">Invoices</h1>

      <div className="toolbar invoices__toolbar">
        <nav className="invoices__tabs" aria-label="Invoice filters">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === tab ? 'is-active' : ''}
              onClick={() => {
                setTab(t.id);
                setSelected([]);
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="toolbar__actions">
          <SearchToggle value={query} onChange={setQuery} placeholder="Client or number" />
          <button type="button" className="btn" onClick={() => navigate('/invoices/new')}>
            <Plus size={16} strokeWidth={1.8} />
            New Invoice
          </button>
          <FilterMenu
            title="Clients"
            options={clientList.map(({ name }) => ({ value: name, label: name }))}
            selected={clients}
            onChange={setClients}
          />
        </div>
      </div>

      <section className="invoices__stats">
        {stats.map((s) => (
          <div key={s.label}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </section>

      <div className="invoices__manage">
        Manage Invoices
        <BulkMenu count={selected.length} archivedTab={tab === 'archived'} onAction={runBulk} />
      </div>

      <table className="invoices__table">
        <thead>
          <tr>
            <th>
              <input type="checkbox" className="round-check" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
            </th>
            <th>Client</th>
            <th>Date</th>
            <th>Invoice Number</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Balance Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="empty-state">
                No invoices here yet.
              </td>
            </tr>
          )}
          {rows.map((invoice) => {
            const status = invoiceStatus(invoice);
            return (
              <tr key={invoice.id} onClick={() => navigate(`/invoices/${invoice.id}`)}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="round-check"
                    checked={selected.includes(invoice.id)}
                    onChange={() => toggleRow(invoice.id)}
                    aria-label={`Select ${invoice.number}`}
                  />
                </td>
                <td>{invoice.client}</td>
                <td>{formatLongDate(fromKey(invoice.date))}</td>
                <td>{invoice.number}</td>
                <td>{formatMoney(invoiceTotals(invoice).total)}</td>
                <td className={`status status--${status.tone}`}>{status.label}</td>
                <td>{formatMoney(balanceDue(invoice))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BulkMenu({ count, archivedTab, onAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const item = (action, label, extraClass = '') => (
    <button
      type="button"
      className={`popover__item ${extraClass}`}
      disabled={count === 0}
      onClick={() => {
        onAction(action);
        setOpen(false);
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="filter-menu" ref={ref}>
      <button type="button" className="icon-button" onClick={() => setOpen((o) => !o)} aria-label="Manage invoices">
        <Ellipsis size={16} />
      </button>
      {open && (
        <div className="popover card popover--left">
          <div className="popover__title">{count ? `${count} selected` : 'Select invoices first'}</div>
          {item('paid', 'Mark as paid')}
          {archivedTab ? item('restore', 'Restore') : item('archive', 'Archive')}
          {item('delete', 'Delete', 'popover__item--danger')}
        </div>
      )}
    </div>
  );
}
