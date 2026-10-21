import { useState } from 'react';
import { Download } from 'lucide-react';
import Modal, { FormRow } from './Modal';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { saveBlob } from '../utils/download';
import { formatMoney } from '../utils/money';
import { durationSeconds, entryAmount, entryDateKey, formatDuration } from '../utils/time';
import './ExportReceiptsModal.css';

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function ExportTimesheetModal({ defaultMonth = thisMonth(), onClose }) {
  const { timeEntries, clients, invoices } = useAppData();
  const { name } = useAuth();
  const [month, setMonth] = useState(defaultMonth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const inMonth = timeEntries.filter((t) => entryDateKey(t).startsWith(month));
  const finished = inMonth.filter((t) => t.end);
  const runningCount = inMonth.length - finished.length;
  const seconds = finished.reduce((s, t) => s + durationSeconds(t), 0);
  const amount = finished.reduce((s, t) => s + entryAmount(t), 0);

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      // Loaded on demand so the spreadsheet library isn't part of the main bundle.
      const { buildTimesheetXlsx } = await import('../lib/exportTimesheet');
      const { blob, fileName } = await buildTimesheetXlsx(month, { entries: timeEntries, clients, invoices, ownerName: name });
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
          Download a month of tracked time as an Excel spreadsheet: every entry with its hours, client, rate and amount,
          plus a summary by client.
        </p>

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

        {runningCount > 0 && (
          <div className="export__missing">A timer is still running in this month. Stop it to include that time.</div>
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
          <button type="button" className="btn" onClick={download} disabled={busy || finished.length === 0}>
            <Download size={15} strokeWidth={1.8} />
            {busy ? 'Preparing…' : 'Download .xlsx'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
