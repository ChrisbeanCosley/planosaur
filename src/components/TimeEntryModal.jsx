import { useState } from 'react';
import Modal, { FormRow } from './Modal';
import { useAppData } from '../context/AppDataContext';
import { newId } from '../data/seed';
import { todayKey } from '../utils/date';
import { combineDateTime, entryDateKey, lastRate, timeOfDay } from '../utils/time';

// Adds a time entry by hand, or edits `entry`. A running entry has no end time to edit.
export default function TimeEntryModal({ entry, defaultDate = todayKey(), onClose }) {
  const { clients, timeEntries, saveTimeEntry, deleteTimeEntry } = useAppData();
  const editing = Boolean(entry);
  const running = editing && !entry.end;
  const clientName = (id) => clients.find((c) => c.id === id)?.name ?? '';

  const [form, setForm] = useState(() => ({
    description: entry?.description ?? '',
    client: clientName(entry?.clientId),
    date: entry ? entryDateKey(entry) : defaultDate,
    start: entry ? timeOfDay(entry.start) : '09:00',
    end: entry?.end ? timeOfDay(entry.end) : running ? '' : '10:00',
    billable: entry?.billable ?? true,
    rate: entry?.rate ?? lastRate(timeEntries, null),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Picking a known client fills in the rate last used for them.
  const setClient = (e) => {
    const name = e.target.value;
    const match = clients.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    setForm((f) => ({ ...f, client: name, rate: match && !editing ? lastRate(timeEntries, match.id) : f.rate }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const start = combineDateTime(form.date, form.start);
    const end = running ? null : combineDateTime(form.date, form.end);
    if (end && end <= start) {
      setError('The end time must be after the start time.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveTimeEntry(
        {
          id: entry?.id ?? newId(),
          description: form.description.trim(),
          start,
          end,
          billable: form.billable,
          rate: form.rate === '' ? null : Number(form.rate),
        },
        form.client,
      );
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!window.confirm('Delete this time entry?')) return;
    deleteTimeEntry(entry.id);
    onClose();
  };

  return (
    <Modal title={editing ? 'Edit time' : 'Add time'} onClose={busy ? () => {} : onClose}>
      <form onSubmit={submit}>
        <FormRow label="What did you work on?">
          <input className="field" value={form.description} onChange={set('description')} autoFocus />
        </FormRow>
        <FormRow label="Client (optional)">
          <input className="field" list="time-client-list" value={form.client} onChange={setClient} placeholder="Choose or type a new client" />
          <datalist id="time-client-list">
            {clients.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </FormRow>
        <div className="form-row-group">
          <FormRow label="Date">
            <input className="field" type="date" required value={form.date} onChange={set('date')} />
          </FormRow>
          <FormRow label="Hourly rate (R)">
            <input className="field" type="number" min="0" step="0.01" value={form.rate} onChange={set('rate')} placeholder="0.00" />
          </FormRow>
        </div>
        <div className="form-row-group">
          <FormRow label="Start">
            <input className="field" type="time" required value={form.start} onChange={set('start')} />
          </FormRow>
          <FormRow label="End">
            {running ? (
              <input className="field" value="Running…" disabled />
            ) : (
              <input className="field" type="time" required value={form.end} onChange={set('end')} />
            )}
          </FormRow>
        </div>
        <label className="form-check">
          <input type="checkbox" checked={form.billable} onChange={(e) => setForm((f) => ({ ...f, billable: e.target.checked }))} />
          Billable
        </label>

        {error && (
          <p className="form-error" role="alert">
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
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add time'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
