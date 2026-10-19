import { useState } from 'react';
import Modal, { FormRow } from './Modal';
import { EVENT_CATEGORIES } from '../data/categories';
import { todayKey } from '../utils/date';

export default function EventFormModal({ onSave, onClose, defaultDate = todayKey() }) {
  const [form, setForm] = useState({
    title: '',
    category: 'meeting',
    date: defaultDate,
    start: '',
    end: '',
    person: '',
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const { start, end, person, ...rest } = form;
    onSave({
      ...rest,
      title: form.title.trim(),
      ...(start && end ? { start, end } : {}),
      ...(person.trim() ? { person: person.trim() } : {}),
    });
    onClose();
  };

  return (
    <Modal title="Add Event" onClose={onClose}>
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
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn">
            Add Event
          </button>
        </div>
      </form>
    </Modal>
  );
}
