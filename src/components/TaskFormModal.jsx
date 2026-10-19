import { useState } from 'react';
import Modal, { FormRow } from './Modal';
import { TASK_CATEGORIES } from '../data/categories';
import { todayKey } from '../utils/date';

export default function TaskFormModal({ onSave, onClose, defaultDate = todayKey() }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'work',
    date: defaultDate,
    start: '',
    end: '',
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      start: form.start || undefined,
    });
    onClose();
  };

  return (
    <Modal title="Add Task" onClose={onClose}>
      <form onSubmit={submit}>
        <FormRow label="Title">
          <input className="field" required value={form.title} onChange={set('title')} autoFocus />
        </FormRow>
        <FormRow label="Description (optional)">
          <input className="field" value={form.description} onChange={set('description')} />
        </FormRow>
        <div className="form-row-group">
          <FormRow label="Category">
            <select className="field" value={form.category} onChange={set('category')}>
              {Object.entries(TASK_CATEGORIES).map(([value, { label }]) => (
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
          <FormRow label={form.start ? 'End' : 'Due by'}>
            <input className="field" type="time" required value={form.end} onChange={set('end')} />
          </FormRow>
        </div>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn">
            Add Task
          </button>
        </div>
      </form>
    </Modal>
  );
}
