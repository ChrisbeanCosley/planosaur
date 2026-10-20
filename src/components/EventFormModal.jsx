import { useState } from 'react';
import Modal, { FormRow } from './Modal';
import { EVENT_CATEGORIES } from '../data/categories';
import { todayKey } from '../utils/date';

// Adds a new event, or edits `event` when one is passed (then onDelete is shown too).
export default function EventFormModal({ event, onSave, onDelete, onClose, defaultDate = todayKey() }) {
  const editing = Boolean(event);
  const [form, setForm] = useState({
    title: event?.title ?? '',
    category: event?.category ?? 'meeting',
    date: event?.date ?? defaultDate,
    start: event?.start ?? '',
    end: event?.end ?? '',
    person: event?.person ?? '',
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const hasTime = Boolean(form.start && form.end);
    onSave({
      title: form.title.trim(),
      category: form.category,
      date: form.date,
      // Undefined (rather than missing) so editing can clear a time or person.
      start: hasTime ? form.start : undefined,
      end: hasTime ? form.end : undefined,
      person: form.person.trim() || undefined,
    });
    onClose();
  };

  const remove = () => {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    onDelete();
    onClose();
  };

  return (
    <Modal title={editing ? 'Edit Event' : 'Add Event'} onClose={onClose}>
      <form onSubmit={submit}>
        <FormRow label="Title">
          <input className="field" required value={form.title} onChange={set('title')} autoFocus />
        </FormRow>
        <div className="form-row-group">
          <FormRow label="Type">
            <select className="field" value={form.category} onChange={set('category')}>
              {Object.entries(EVENT_CATEGORIES).map(([value, { label }]) => (
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
        <div className="form-row-group">
          <FormRow label="Start (optional)">
            <input className="field" type="time" value={form.start} onChange={set('start')} />
          </FormRow>
          <FormRow label="End (optional)">
            <input className="field" type="time" value={form.end} onChange={set('end')} />
          </FormRow>
        </div>
        <FormRow label="With (optional)">
          <input className="field" value={form.person} onChange={set('person')} placeholder="e.g. Sarah J" />
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
            {editing ? 'Save changes' : 'Add Event'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
