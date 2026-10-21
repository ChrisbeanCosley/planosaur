import { useState } from 'react';
import { Download } from 'lucide-react';
import Modal, { FormRow } from './Modal';
import { useAppData } from '../context/AppDataContext';
import { buildReceiptsZip, monthSummary } from '../lib/exportReceipts';
import { saveBlob } from '../utils/download';
import { formatMoney } from '../utils/money';
import './ExportReceiptsModal.css';

// "2026-10" for the month a date falls in.
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export default function ExportReceiptsModal({ defaultMonth = monthKey(new Date()), onClose }) {
  const { expenses, receipts } = useAppData();
  const [month, setMonth] = useState(defaultMonth);
  const [progress, setProgress] = useState(null); // { done, total } while exporting
  const [error, setError] = useState('');

  const { monthExpenses, missing, receiptCount } = monthSummary(month, expenses, receipts);
  const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const busy = progress !== null;

  const exportZip = async () => {
    setError('');
    setProgress({ done: 0, total: receiptCount });
    try {
      const { blob, fileName } = await buildReceiptsZip(month, expenses, receipts, (done, all) =>
        setProgress({ done, total: all }),
      );
      saveBlob(blob, fileName);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <Modal title="Export receipts" onClose={busy ? () => {} : onClose}>
      <div className="export">
        <p className="export__intro">
          Download every receipt for a month as one zip file, with a spreadsheet (CSV) listing each expense. Handy for
          VAT returns and your accountant.
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
            <strong>{receiptCount}</strong>
            <span>receipt{receiptCount === 1 ? '' : 's'}</span>
          </div>
          <div>
            <strong>{monthExpenses.length}</strong>
            <span>expense{monthExpenses.length === 1 ? '' : 's'}</span>
          </div>
          <div>
            <strong>{formatMoney(total)}</strong>
            <span>total spent</span>
          </div>
        </div>

        {missing.length > 0 && (
          <div className="export__missing">
            <strong>
              {missing.length} expense{missing.length === 1 ? ' has' : 's have'} no receipt
            </strong>
            <ul>
              {missing.slice(0, 5).map((e) => (
                <li key={e.id}>
                  {e.date} · {e.payee} · {formatMoney(e.amount)}
                </li>
              ))}
              {missing.length > 5 && <li>…and {missing.length - 5} more (all marked in the CSV)</li>}
            </ul>
          </div>
        )}

        {error && (
          <p className="export__error" role="alert">
            {error}
          </p>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={exportZip} disabled={busy || monthExpenses.length === 0}>
            <Download size={15} strokeWidth={1.8} />
            {busy
              ? progress.total
                ? `Downloading ${progress.done} of ${progress.total}…`
                : 'Preparing…'
              : 'Download zip'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
