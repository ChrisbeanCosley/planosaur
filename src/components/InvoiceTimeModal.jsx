import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import Modal, { FormRow } from './Modal';
import { useAppData } from '../context/AppDataContext';
import { newId } from '../data/seed';
import { formatMoney } from '../utils/money';
import { entryAmount, entryHours, entryInvoiceItem, isUnbilled } from '../utils/time';
import './InvoiceTimeModal.css';

// Pick a client's unbilled time, then open the invoice editor prefilled with it.
export default function InvoiceTimeModal({ onClose }) {
  const { clients, timeEntries, timeInvoicingMissing } = useAppData();
  const navigate = useNavigate();

  const unbilled = timeEntries.filter(isUnbilled).sort((a, b) => a.start.localeCompare(b.start));
  const billableClients = clients.filter((c) => unbilled.some((t) => t.clientId === c.id));

  const [clientId, setClientId] = useState(billableClients[0]?.id ?? '');
  const [left, setLeft] = useState(() => new Set()); // entries unticked for this client
  const entries = unbilled.filter((t) => t.clientId === clientId);
  const chosen = entries.filter((t) => !left.has(t.id));
  const total = chosen.reduce((s, t) => s + entryAmount(t), 0);

  const toggle = (id) =>
    setLeft((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const changeClient = (e) => {
    setClientId(e.target.value);
    setLeft(new Set());
  };

  const create = () => {
    const client = clients.find((c) => c.id === clientId);
    navigate('/invoices/new', {
      state: {
        fromTime: {
          client: client.name,
          timeEntryIds: chosen.map((t) => t.id),
          items: chosen.map((t) => entryInvoiceItem(t, newId())),
        },
      },
    });
  };

  return (
    <Modal title="Create invoice from time" onClose={onClose}>
      <div className="invoice-time">
        {timeInvoicingMissing ? (
          <p className="invoice-time__note">
            Run <code>supabase/migrations/0007_time_entries_invoice.sql</code> in the Supabase SQL Editor, then refresh
            this page to invoice tracked time.
          </p>
        ) : billableClients.length === 0 ? (
          <p className="invoice-time__note">No unbilled time yet. Finished, billable entries with a client show up here.</p>
        ) : (
          <>
            <FormRow label="Client">
              <select className="field" value={clientId} onChange={changeClient}>
                {billableClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormRow>

            <ul className="invoice-time__entries">
              {entries.map((t) => (
                <li key={t.id}>
                  <label className="form-check invoice-time__entry">
                    <input type="checkbox" checked={!left.has(t.id)} onChange={() => toggle(t.id)} />
                    <span className="invoice-time__desc">{entryInvoiceItem(t).description}</span>
                    <span className="invoice-time__hours">{entryHours(t).toFixed(2)} h</span>
                    <span className="invoice-time__amount">{formatMoney(entryAmount(t))}</span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="invoice-time__total">
              <span>
                {chosen.length} of {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </span>
              <strong>{formatMoney(total)}</strong>
            </div>
          </>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--green"
            onClick={create}
            disabled={timeInvoicingMissing || chosen.length === 0}
          >
            <FileText size={15} strokeWidth={1.8} /> Create
          </button>
        </div>
      </div>
    </Modal>
  );
}
