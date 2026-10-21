import { useState } from 'react';
import { Flag } from 'lucide-react';
import Modal, { FormRow } from './Modal';
import { useAppData } from '../context/AppDataContext';
import { TASK_CATEGORIES } from '../data/categories';
import { todayKey } from '../utils/date';
import './TaskFormModal.css';

const PRIORITIES = [
  ['low', 'Low'],
  ['normal', 'Normal'],
  ['high', 'High'],
];

// Adds a new task, or edits `task` when one is passed (then onDelete is shown too).
export default function TaskFormModal({ task, onSave, onDelete, onClose, defaultDate = todayKey() }) {
  const editing = Boolean(task);
  const { taskPriorityMissing } = useAppData();
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    category: task?.category ?? 'work',
    date: task?.date ?? defaultDate,
    start: task?.start ?? '',
    end: task?.end ?? '',
    done: task?.done ?? false,
    priority: task?.priority ?? 'normal',
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

  const remove = () => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    onDelete();
    onClose();
  };

  return (
    <Modal title={editing ? 'Edit Task' : 'Add Task'} onClose={onClose}>
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
        {!taskPriorityMissing && (
          <FormRow label="Priority">
            <div className="view-toggle task-priority" role="group" aria-label="Priority">
              {PRIORITIES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`${form.priority === value ? 'is-active' : ''} task-priority--${value}`}
                  aria-pressed={form.priority === value}
                  onClick={() => setForm((f) => ({ ...f, priority: value }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </FormRow>
        )}

        {form.priority === 'high' && !taskPriorityMissing && (
          <section className="task-high" aria-label="High priority">
            <p className="task-high__title">
              <Flag size={13} strokeWidth={2} /> High priority task
            </p>
            <p className="task-high__text">
              This task is marked as high priority. It’s pinned to the top of Today’s Tasks on your dashboard with a ⚡.
            </p>
          </section>
        )}

        {editing && (
          <label className="form-check">
            <input
              type="checkbox"
              checked={form.done}
              onChange={(e) => setForm((f) => ({ ...f, done: e.target.checked }))}
            />
            Done
          </label>
        )}
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
            {editing ? 'Save changes' : 'Add Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
