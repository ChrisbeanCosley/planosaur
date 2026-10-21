import { useState } from 'react';
import { Download } from 'lucide-react';
import Modal, { FormRow } from './Modal';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { todayKey } from '../utils/date';
import { saveBlob } from '../utils/download';
import { formatMoney } from '../utils/money';
import { customRange, durationSeconds, entriesInRange, entryAmount, entryDateKey, formatDuration, monthRange } from '../utils/time';
import './ExportReceiptsModal.css';

const thisMonth = () => todayKey().slice(0, 7);

export default function ExportTimesheetModal({ defaultMonth = thisMonth(), onClose }) {
  const { timeEntries, clients, invoices } = useAppData();
  const { name } = useAuth();
  const [mode, setMode] = useState('month'); // 'month' | 'range'
  const [month, setMonth] = useState(defaultMonth);
  // A custom range starts as the chosen month, up to today if that's sooner.
  const [from, setFrom] = useState(() => monthRange(defaultMonth).from);
  const [to, setTo] = useState(() => {
    const end = monthRange(defaultMonth).to;
    return todayKey() < end && todayKey() >= monthRange(defaultMonth).from ? todayKey() : end;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const rangeInvalid = mode === 'range' && (!from || !to || from > to);
  const range = mode === 'month' ? monthRange(month) : rangeInvalid ? null : customRange(from, to);

  const finished = range ? entriesInRange(timeEntries, range) : [];
  const runningCount = range
    ? timeEntries.filter((t) => !t.end && entryDateKey(t) >= range.from && entryDateKey(t) <= range.to).length
    : 0;
  const seconds = finished.reduce((s, t) => s + durationSeconds(t), 0);
  const amount = finished.reduce((s, t) => s + entryAmount(t), 0);

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      // Loaded on demand so the spreadsheet library isn't part of the main bundle.
      const { buildTimesheetXlsx } = await import('../lib/exportTimesheet');
      const { blob, fileName } = await buildTimesheetXlsx(range, { entries: timeEntries, clients, invoices, ownerName: name });
      saveBlob(blob, fileName);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Export timesheet" onClose={busy ? () => {} : onClose}>
      <div className="export">
        <p className="export__intro">
          Download tracked time as an Excel spreadsheet: every entry with its hours, client, rate and amount, plus a
          summary by client.
        </p>

        <div className="view-toggle export__mode" role="group" aria-label="Export period">
          {[
            ['month', 'Month'],
            ['range', 'Date range'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={mode === value ? 'is-active' : ''}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              disabled={busy}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'month' ? (
          <FormRow label="Month">
            <input
              className="field"
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              disabled={busy}
              required
            />
          </FormRow>
        ) : (
          <div className="form-row-group">
            <FormRow label="From">
              <input className="field" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} disabled={busy} required />
            </FormRow>
            <FormRow label="To">
              <input className="field" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} disabled={busy} required />
            </FormRow>
          </div>
        )}

        {rangeInvalid ? (
          <p className="form-error" role="alert">
            Choose a start date that’s on or before the end date.
          </p>
        ) : (
          <div className="export__summary">
            <div>
              <strong>{formatDuration(seconds)}</strong>
              <span>hours</span>
            </div>
            <div>
              <strong>{finished.length}</strong>
              <span>entr{finished.length === 1 ? 'y' : 'ies'}</span>
            </div>
            <div>
              <strong>{formatMoney(amount)}</strong>
              <span>billable</span>
            </div>
          </div>
        )}

        {runningCount > 0 && (
          <div className="export__missing">A timer is still running in this period. Stop it to include that time.</div>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={download} disabled={busy || !range || finished.length === 0}>
            <Download size={15} strokeWidth={1.8} />
            {busy ? 'Preparing…' : 'Download .xlsx'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
